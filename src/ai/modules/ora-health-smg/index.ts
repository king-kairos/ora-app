import fs from "fs/promises";
import path from "path";

type CoreHealthResponse = {
  ok: boolean;
  status?: string;
  modules?: string[];
  time?: number;
  error?: string;
};

type AutoprogSummaryResponse = {
  ok: boolean;
  proposals?: {
    total?: number;
    pending?: number;
    approved?: number;
    applied?: number;
    denied?: number;
    archived?: number;
    rejected?: number;
  };
  error?: string;
};

type HealthReport = {
  ok: boolean;
  module: string;
  timestamp: number;
  result: "healthy" | "issues_detected";
  recommendedAction: "none" | "diagnostic_only";
  checks: {
    coreHealthReachable: boolean;
    autoprogSummaryReachable: boolean;
  };
  expected: {
    corePort: number;
  };
  actual: {
    coreStatus: string | null;
    modules: string[];
    pending: number;
    approved: number;
    applied: number;
    archived: number;
  };
  issues: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    reason: string;
  }>;
  proposalEligibility: {
    allowed: boolean;
    reason: string;
  };
};

const CORE_HEALTH_URL = "http://localhost:3001/api/ora/health";
const AUTOPROG_SUMMARY_URL = "http://localhost:3001/api/ora/autoprog/summary";

const ORA_HEALTH_DIR = path.join(process.cwd(), "data", "ora-health");
const ORA_HEALTH_REPORTS_DIR = path.join(ORA_HEALTH_DIR, "reports");
const ORA_HEALTH_LATEST_REPORT = path.join(ORA_HEALTH_DIR, "latest-report.json");

export async function fetchCoreHealth(): Promise<CoreHealthResponse> {
  try {
    const response = await fetch(CORE_HEALTH_URL);

    if (!response.ok) {
      return {
        ok: false,
        error: `core_health_http_${response.status}`,
      };
    }

    const data = (await response.json()) as CoreHealthResponse;

    return {
      ok: Boolean(data.ok),
      status: typeof data.status === "string" ? data.status : undefined,
      modules: Array.isArray(data.modules) ? data.modules : [],
      time: typeof data.time === "number" ? data.time : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "core_health_fetch_failed",
    };
  }
}

export async function fetchAutoprogSummary(): Promise<AutoprogSummaryResponse> {
  try {
    const response = await fetch(AUTOPROG_SUMMARY_URL);

    if (!response.ok) {
      return {
        ok: false,
        error: `autoprog_summary_http_${response.status}`,
      };
    }

    const data = (await response.json()) as AutoprogSummaryResponse;

    return {
      ok: Boolean(data.ok),
      proposals: {
        total: data.proposals?.total ?? 0,
        pending: data.proposals?.pending ?? 0,
        approved: data.proposals?.approved ?? 0,
        applied: data.proposals?.applied ?? 0,
        denied: data.proposals?.denied ?? 0,
        archived: data.proposals?.archived ?? 0,
        rejected: data.proposals?.rejected ?? 0,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "autoprog_summary_fetch_failed",
    };
  }
}

export async function buildHealthReport(): Promise<HealthReport> {
  const timestamp = Date.now();

  const coreHealth = await fetchCoreHealth();
  const autoprogSummary = await fetchAutoprogSummary();

  const issues: HealthReport["issues"] = [];

  if (!coreHealth.ok) {
    issues.push({
      code: "core_unreachable",
      severity: "high",
      reason: coreHealth.error ?? "El core no respondió correctamente.",
    });
  }

  if (!autoprogSummary.ok) {
    issues.push({
      code: "autoprog_summary_unreachable",
      severity: "high",
      reason: autoprogSummary.error ?? "El summary de autoprog no respondió correctamente.",
    });
  }

  const pending = autoprogSummary.proposals?.pending ?? 0;
  const approved = autoprogSummary.proposals?.approved ?? 0;
  const applied = autoprogSummary.proposals?.applied ?? 0;
  const archived = autoprogSummary.proposals?.archived ?? 0;

  if (pending > 0) {
    issues.push({
      code: "autoprog_queue_not_clean",
      severity: "medium",
      reason: `Hay ${pending} proposal(s) pendientes en autoprog.`,
    });
  }

  if (approved > 0) {
    issues.push({
      code: "autoprog_has_approved",
      severity: "medium",
      reason: `Hay ${approved} proposal(s) aprobadas todavía abiertas.`,
    });
  }

  const result: HealthReport["result"] =
    issues.length > 0 ? "issues_detected" : "healthy";

  const recommendedAction: HealthReport["recommendedAction"] =
    issues.length > 0 ? "diagnostic_only" : "none";

  return {
    ok: true,
    module: "ora-health-smg",
    timestamp,
    result,
    recommendedAction,
    checks: {
      coreHealthReachable: Boolean(coreHealth.ok),
      autoprogSummaryReachable: Boolean(autoprogSummary.ok),
    },
    expected: {
      corePort: 3001,
    },
    actual: {
      coreStatus: coreHealth.status ?? null,
      modules: Array.isArray(coreHealth.modules) ? coreHealth.modules : [],
      pending,
      approved,
      applied,
      archived,
    },
    issues,
    proposalEligibility: {
      allowed: false,
      reason: "diagnostic_only",
    },
  };
}

export async function saveHealthReport(
  report: HealthReport
): Promise<{
  latestPath: string;
  historyPath: string;
}> {
  await fs.mkdir(ORA_HEALTH_DIR, { recursive: true });
  await fs.mkdir(ORA_HEALTH_REPORTS_DIR, { recursive: true });

  const reportJson = JSON.stringify(report, null, 2);
  const historyPath = path.join(
    ORA_HEALTH_REPORTS_DIR,
    `report-${report.timestamp}.json`
  );

  await fs.writeFile(ORA_HEALTH_LATEST_REPORT, reportJson, "utf-8");
  await fs.writeFile(historyPath, reportJson, "utf-8");

  return {
    latestPath: ORA_HEALTH_LATEST_REPORT,
    historyPath,
  };
}

export async function runOraHealthAudit(): Promise<{
  ok: true;
  report: HealthReport;
  saved: {
    latestPath: string;
    historyPath: string;
  };
}> {
  const report = await buildHealthReport();
  const saved = await saveHealthReport(report);

  return {
    ok: true,
    report,
    saved,
  };
}
