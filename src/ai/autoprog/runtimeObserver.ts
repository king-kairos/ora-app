import { exec as execCallback } from "child_process";
import { promisify } from "util";

const execAsync = promisify(execCallback);

export type RuntimeProcessSnapshot = {
  name: string;
  online: boolean;
  status: string;
  restarts: number;
  pid: number | null;
  raw?: any;
};

export type RuntimeEndpointSnapshot = {
  url: string;
  ok: boolean;
  status: number | null;
  error?: string | null;
  protected?: boolean;
  authRequired?: boolean;
};

export type RuntimeIssue = {
  type: string;
  source: string;
  message: string;
  severity: "low" | "medium" | "high";
};

export type RuntimeObserverSnapshot = {
  ok: boolean;
  checkedAt: string;
  processes: {
    ora: RuntimeProcessSnapshot;
    oraFront: RuntimeProcessSnapshot;
  };
  endpoints: {
    homepage: RuntimeEndpointSnapshot;
    kairos: RuntimeEndpointSnapshot;
  };
  issues: RuntimeIssue[];
};

function buildEmptyProcess(name: string): RuntimeProcessSnapshot {
  return {
    name,
    online: false,
    status: "unknown",
    restarts: 0,
    pid: null,
  };
}

async function readPm2Process(name: string): Promise<RuntimeProcessSnapshot> {
  try {
    const { stdout } = await execAsync(`pm2 jlist`);
    const parsed = JSON.parse(stdout || "[]");

    if (!Array.isArray(parsed)) {
      return buildEmptyProcess(name);
    }

    const item = parsed.find((x: any) => String(x?.name || "") === name);
    if (!item) {
      return buildEmptyProcess(name);
    }

    const status = String(item?.pm2_env?.status || "unknown");
    const restarts = Number(item?.pm2_env?.restart_time || 0);
    const pid =
      typeof item?.pid === "number" && Number.isFinite(item.pid)
        ? item.pid
        : null;

    return {
      name,
      online: status === "online",
      status,
      restarts,
      pid,
      raw: {
        monit: item?.monit || null,
      },
    };
  } catch {
    return buildEmptyProcess(name);
  }
}

async function checkUrl(
  url: string,
  options?: {
    treat401AsProtected?: boolean;
  }
): Promise<RuntimeEndpointSnapshot> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "cache-control": "no-cache",
      },
    });

    if (options?.treat401AsProtected && response.status === 401) {
      return {
        url,
        ok: true,
        status: 401,
        error: null,
        protected: true,
        authRequired: true,
      };
    }

    return {
      url,
      ok: response.ok,
      status: response.status,
      error: response.ok ? null : `HTTP_${response.status}`,
      protected: false,
      authRequired: false,
    };
  } catch (err: any) {
    return {
      url,
      ok: false,
      status: null,
      error: err?.message || "FETCH_FAILED",
      protected: false,
      authRequired: false,
    };
  }
}

export async function observeRuntime(): Promise<RuntimeObserverSnapshot> {
  const checkedAt = new Date().toISOString();

  const [ora, oraFront, homepage, kairos] = await Promise.all([
    readPm2Process("ora"),
    readPm2Process("ora-front"),
    checkUrl("https://orareal.com"),
    checkUrl("https://orareal.com/kairos", { treat401AsProtected: true }),
  ]);

  const issues: RuntimeIssue[] = [];

  if (!ora.online) {
    issues.push({
      type: "backend_offline",
      source: "pm2:ora",
      message: "El proceso ora no está online.",
      severity: "high",
    });
  }

  if (!oraFront.online) {
    issues.push({
      type: "frontend_offline",
      source: "pm2:ora-front",
      message: "El proceso ora-front no está online.",
      severity: "high",
    });
  }

  if (!homepage.ok) {
    issues.push({
      type: "homepage_unreachable",
      source: "https://orareal.com",
      message: homepage.error || "La homepage no respondió correctamente.",
      severity: "high",
    });
  }

  if (!kairos.ok) {
    issues.push({
      type: "kairos_unreachable",
      source: "https://orareal.com/kairos",
      message: kairos.error || "La ruta /kairos no respondió correctamente.",
      severity: "high",
    });
  } else if (kairos.protected && kairos.status === 401) {
    issues.push({
      type: "kairos_protected",
      source: "https://orareal.com/kairos",
      message: "La ruta /kairos está protegida y respondió 401 correctamente.",
      severity: "low",
    });
  }

  const criticalIssues = issues.filter((issue) => issue.severity === "high");

  return {
    ok: criticalIssues.length === 0,
    checkedAt,
    processes: {
      ora,
      oraFront,
    },
    endpoints: {
      homepage,
      kairos,
    },
    issues,
  };
}
