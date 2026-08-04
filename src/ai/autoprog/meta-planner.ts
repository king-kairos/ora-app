import { listAllProposals } from "./patchStore";

type Proposal = {
  id?: string;
  title?: string;
  summary?: string;
  type?: string;
  risk?: string;
  status?: string;
  source?: string;
  metadata?: Record<string, any> | null;
  targetFiles?: string[];
  proposedBy?: string;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: any;
};

function normalizeText(value: any) {
  return String(value || "").trim().toLowerCase();
}

function riskScore(risk?: string) {
  const value = normalizeText(risk);

  if (value === "low") return 1;
  if (value === "medium") return 2;
  if (value === "high") return 3;

  return 9;
}

function typeScore(type?: string) {
  const value = normalizeText(type);

  if (value === "intent") return 1;
  if (value === "proposal") return 2;
  if (value === "patch") return 3;

  return 5;
}

function sourceScore(source?: string) {
  const value = normalizeText(source);

  if (value === "builder-propose-from-scan") return 1;
  if (value === "patchstore") return 2;
  if (value === "manual") return 3;
  if (value === "kairos-command-layer") return 2;
  if (value === "builder-natural") return 2;

  return 5;
}

function pendingAgeScore(createdAt?: number) {
  if (!createdAt || !Number.isFinite(createdAt)) return 3;

  const ageMs = Date.now() - createdAt;
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours >= 72) return 1;
  if (ageHours >= 24) return 2;
  return 3;
}

function priorityLabel(score: number) {
  if (score <= 5) return "alta";
  if (score <= 8) return "media";
  return "baja";
}

function cleanTarget(value: any) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text === "N/D") return "";
  if (text === "n/d") return "";
  return text;
}

function extractTargetFiles(proposal: Proposal): string[] {
  const direct = Array.isArray(proposal.targetFiles) ? proposal.targetFiles : [];
  const meta = Array.isArray(proposal?.metadata?.targetFiles)
    ? proposal.metadata?.targetFiles
    : [];

  const merged = [...direct, ...meta]
    .map((item) => cleanTarget(item))
    .filter(Boolean);

  return Array.from(new Set(merged));
}

function extractPrimaryTarget(proposal: Proposal) {
  const targets = extractTargetFiles(proposal);
  return targets.length > 0 ? targets[0] : "";
}

function isExecutableProposal(proposal: Proposal) {
  const targetFile = extractPrimaryTarget(proposal);
  const targetFiles = extractTargetFiles(proposal);

  return !!targetFile || targetFiles.length > 0;
}

export async function runMetaPlanner() {
  const all = (await listAllProposals()) as Proposal[];

  const pending = all.filter(
    (p) => normalizeText(p.status || "pending") === "pending"
  );

  const planned = pending
    .filter(isExecutableProposal)
    .map((proposal) => {
      const targetFiles = extractTargetFiles(proposal);
      const targetFile = targetFiles[0] || "";

      const score =
        riskScore(proposal.risk) +
        typeScore(proposal.type) +
        sourceScore(proposal.source) +
        pendingAgeScore(proposal.createdAt);

      return {
        id: proposal.id || "sin-id",
        title: proposal.title || "Sin título",
        summary: proposal.summary || "",
        type: proposal.type || "N/D",
        risk: proposal.risk || "unknown",
        source: proposal.source || "N/D",
        targetFile,
        targetFiles,
        proposedBy: proposal.proposedBy || "N/D",
        createdAt: proposal.createdAt || null,
        updatedAt: proposal.updatedAt || null,
        score,
        priority: priorityLabel(score),
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return Number(a.createdAt || 0) - Number(b.createdAt || 0);
    });

  const skippedWithoutTarget = pending
    .filter((proposal) => !isExecutableProposal(proposal))
    .map((proposal) => ({
      id: proposal.id || "sin-id",
      title: proposal.title || "Sin título",
      source: proposal.source || "N/D",
    }));

  const groups = {
    alta: planned.filter((p) => p.priority === "alta"),
    media: planned.filter((p) => p.priority === "media"),
    baja: planned.filter((p) => p.priority === "baja"),
  };

  return {
    ok: true,
    createdAt: new Date().toISOString(),
    totalPending: pending.length,
    totalPlanned: planned.length,
    skippedWithoutTarget: skippedWithoutTarget.length,
    summary: {
      alta: groups.alta.length,
      media: groups.media.length,
      baja: groups.baja.length,
    },
    ordered: planned,
    groups,
    skipped: {
      withoutTarget: skippedWithoutTarget,
    },
    message:
      "Meta-planner ejecutado: ORA priorizó propuestas pendientes reales y descartó las que no tenían target ejecutable.",
  };
}
