import { observeRuntime } from "./runtimeObserver";
import {
  normalizeRuntimeErrors,
  type NormalizedRuntimeError,
} from "./errorNormalizer";
import { exec as execCallback } from "child_process";
import { promisify } from "util";

const execAsync = promisify(execCallback);

export type AutoHealProposalFile = {
  path: string;
  mode: string;
  content?: string;
};

export type AutoHealProposal = {
  title: string;
  summary: string;
  files: AutoHealProposalFile[];
};

export type AutoHealResult = {
  ok: boolean;
  snapshot: Awaited<ReturnType<typeof observeRuntime>>;
  normalized: NormalizedRuntimeError[];
  recommendedAction: "none" | "proposal_only";
  detectedIssue: string | null;
  proposal: AutoHealProposal | null;
  message: string;
};

async function readPm2Logs(processName: string, lines = 80): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      `pm2 logs ${processName} --lines ${lines} --nostream`
    );

    return String(stdout || "")
      .split("\n")
      .map((line) => line.replace(/\x1b\[[0-9;]*m/g, "").trim())
      .filter(Boolean)
      .slice(-lines);
  } catch {
    return [];
  }
}

async function readLogs(): Promise<string[]> {
  const [oraLogs, frontLogs] = await Promise.all([
    readPm2Logs("ora", 80),
    readPm2Logs("ora-front", 80),
  ]);

  return Array.from(new Set([...oraLogs, ...frontLogs])).slice(-160);
}

function isUsefulLogLine(line: string): boolean {
  const text = String(line || "").trim();
  if (!text) return false;

  const ignorePatterns = [
    /^\d+\|[^\s]+\s*\|?$/i,
    /^\d+\|[^\s]+\s*\|\s*> ora-app@/i,
    /^\d+\|[^\s]+\s*\|\s*> PORT=\d+\s+npx\s+tsx\s+src\/app\.ts/i,
    /^\d+\|[^\s]+\s*\|\s*ORA Core listening on port \d+/i,
    /^> ora-app@/i,
    /^> PORT=\d+\s+npx\s+tsx\s+src\/app\.ts/i,
    /^ORA Core listening on port \d+/i,
  ];

  if (ignorePatterns.some((pattern) => pattern.test(text))) {
    return false;
  }

  const usefulPatterns = [
    /Failed to find Server Action/i,
    /Property 'name' does not exist on type 'BranchRecord'/i,
    /SEAL_DENIED|SEAL_REQUIRED/i,
    /PUBLISH_BUILD_FAIL/i,
    /missing-branch-files/i,
    /missing-clone-files/i,
    /build failed/i,
    /compile failed/i,
    /error:/i,
    /uncaught/i,
    /exception/i,
  ];

  return usefulPatterns.some((pattern) => pattern.test(text));
}

function buildDetectedProposal(issue: NormalizedRuntimeError): AutoHealProposal {
  return {
    title: `Auto-heal detectó: ${issue.code}`,
    summary: issue.explanation,
    files: [
      {
        path: `data/autoprog/auto-heal/log-detected-${issue.code}.json`,
        mode: "full-file",
        content: JSON.stringify(
          {
            code: issue.code,
            explanation: issue.explanation,
            confidence: issue.confidence,
            matchedText: issue.matchedText,
            createdAt: new Date().toISOString(),
          },
          null,
          2
        ),
      },
    ],
  };
}

function isInformationalOnly(issue: NormalizedRuntimeError): boolean {
  return issue.code === "kairos_protected";
}

function buildUnknownRuntimeError(
  matchedText: string,
  explanation: string
): NormalizedRuntimeError {
  return {
    code: "unknown",
    confidence: 1,
    matchedText,
    explanation,
  };
}

export async function runAutoHealAnalysis(): Promise<AutoHealResult> {
  const snapshot = await observeRuntime();

  const rawSignals: string[] = [];

  for (const issue of snapshot.issues) {
    rawSignals.push(`${issue.type}: ${issue.message}`);
  }

  const logs = await readLogs();
  const usefulLogs = logs.filter(isUsefulLogLine);
  rawSignals.push(...usefulLogs);

  const normalized = normalizeRuntimeErrors(rawSignals).filter(
    (item) => item.code !== "unknown" || item.matchedText.includes(":")
  );

  let proposal: AutoHealProposal | null = null;
  let detectedIssue: string | null = null;

  const hasFrontendOffline = snapshot.issues.some(
    (x) => x.type === "frontend_offline" || x.type === "homepage_unreachable"
  );

  const hasBackendOffline = snapshot.issues.some(
    (x) => x.type === "backend_offline"
  );

  if (hasFrontendOffline) {
    const detected = buildUnknownRuntimeError(
      "frontend_offline",
      "Frontend no está disponible o la homepage no responde."
    );

    detectedIssue = "frontend_offline";
    proposal = buildDetectedProposal(detected);
  } else if (hasBackendOffline) {
    const detected = buildUnknownRuntimeError(
      "backend_offline",
      "Backend no está disponible."
    );

    detectedIssue = "backend_offline";
    proposal = buildDetectedProposal(detected);
  } else {
    const detected = normalized.find(
      (x) => x.code !== "unknown" && !isInformationalOnly(x)
    );

    if (detected) {
      detectedIssue = detected.code;
      proposal = buildDetectedProposal(detected);
    }
  }

  if (!proposal) {
    return {
      ok: true,
      snapshot,
      normalized,
      recommendedAction: "none",
      detectedIssue: null,
      proposal: null,
      message:
        "No se detectaron problemas que requieran proposal automática.",
    };
  }

  return {
    ok: true,
    snapshot,
    normalized,
    recommendedAction: "proposal_only",
    detectedIssue,
    proposal,
    message:
      "Auto-heal detectó un patrón real y generó propuesta soberana.",
  };
}
