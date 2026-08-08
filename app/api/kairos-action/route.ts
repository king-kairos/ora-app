import fs from "fs";
import path from "path";

type KairosAction =
  | "scan-rafael"
  | "scan-kaerliana"
  | "scan-orion"
  | "scan-arturo"
  | "scan-lucian"
  | "scan-ignis"
  | "scan-aelion"
  | "scan-council"
  | "apply"
  | "deny"
  | "archive"
  | "detect"
  | "meta-planner"
  | "supervisor"
  | "auto-apply"
  | "loop";

function redirectHtml(url: string) {
  return new Response(
    `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${url}" /></head><body>Redirigiendo...</body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

function wantsJson(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  const accept = req.headers.get("accept") || "";
  return (
    contentType.includes("application/json") ||
    accept.includes("application/json")
  );
}

function jsonResponse(ok: boolean, payload: Record<string, any>, status = 200) {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function respond(req: Request, ok: boolean, payload: Record<string, any>) {
  if (wantsJson(req)) {
    return jsonResponse(ok, payload, ok ? 200 : 400);
  }
  return redirectHtml("/kairos");
}

function proposalFilePath(proposalId: string) {
  return path.join(process.cwd(), "ora-data", "proposals", `${proposalId}.json`);
}

function updateProposalStatus(
  proposalId: string,
  status: "applied" | "denied" | "archived"
) {
  const filePath = proposalFilePath(proposalId);

  if (!fs.existsSync(filePath)) return false;

  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);

  data.status = status;
  data.updatedAt = new Date().toISOString();

  if (status === "applied") data.appliedAt = data.updatedAt;
  if (status === "denied") data.deniedAt = data.updatedAt;
  if (status === "archived") {
    data.archivedAt = data.updatedAt;
    data.archived = true;
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return true;
}

function getInternalBase(req: Request) {
  const envBase =
    process.env.ORA_API_BASE_URL ||
    process.env.ORA_INTERNAL_BASE_URL ||
    process.env.INTERNAL_BASE_URL ||
    "";

  if (envBase) return envBase.replace(/\/+$/, "");

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

async function callInternal(
  req: Request,
  targetPath: string,
  init?: RequestInit
) {
  const base = getInternalBase(req);
  const url = `${base}${targetPath}`;

  const receivedSeal = String(
    req.headers.get("x-kairos-seal") ||
    req.headers.get("kairos-seal") ||
    ""
  ).trim();

  const headers = new Headers(init?.headers || {});

  if (receivedSeal && !headers.has("x-kairos-seal")) {
    headers.set("x-kairos-seal", receivedSeal);
  }

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function runCouncilScan(req: Request, actor: string) {
  const candidates = ["/api/council-scan", "/api/autoprog/council-scan"];

  for (const target of candidates) {
    try {
      const res = await callInternal(req, target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor }),
      });

      const data = await safeJson(res);

      if (res.ok) {
        return {
          ok: true,
          message: data?.message || `Escaneo ejecutado con ${actor}.`,
          actor,
          data,
        };
      }
    } catch {}
  }

  return {
    ok: false,
    error: `No se pudo ejecutar el escaneo con ${actor}.`,
  };
}

async function runMotorAction(
  req: Request,
  action: "detect" | "meta-planner" | "supervisor" | "auto-apply" | "loop"
) {
  const pathMap: Record<typeof action, string[]> = {
    detect: ["/api/autoprog/detect"],
    "meta-planner": ["/api/autoprog/meta-planner"],
    supervisor: ["/api/ora/autoprog/supervisor/run", "/api/autoprog/supervisor"],
    "auto-apply": ["/api/autoprog/auto-apply"],
    loop: ["/api/autoprog/loop"],
  };

  for (const target of pathMap[action]) {
    try {
      const method = target.includes("/supervisor/run") ? "POST" : "GET";
      const res = await callInternal(req, target, { method });
      const data = await safeJson(res);

      if (!res.ok) continue;

      return {
        ok: true,
        message: data?.message || `${action} ejecutado.`,
        data,
      };
    } catch {}
  }

  return {
    ok: false,
    error: `Fallo ejecutando ${action}.`,
  };
}

async function applyProposal(req: Request, proposalId: string) {
  if (!proposalId) return { ok: false, error: "MISSING_PROPOSAL_ID" };

  try {
    const res = await callInternal(req, "/api/apply-proposal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ proposalId }),
    });

    const data = await safeJson(res);

    if (!res.ok || data?.ok === false) {
      return {
        ok: false,
        error: data?.error || data?.message || "No se pudo aplicar la propuesta.",
        data,
      };
    }

    updateProposalStatus(proposalId, "applied");

    return {
      ok: true,
      message: data?.message || "Propuesta aplicada correctamente.",
      data,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || "Fallo aplicando propuesta.",
    };
  }
}

async function denyProposal(req: Request, proposalId: string) {
  if (!proposalId) return { ok: false, error: "MISSING_PROPOSAL_ID" };

  try {
    const res = await callInternal(
      req,
      `/api/ora/autoprog/deny/${encodeURIComponent(proposalId)}`,
      { method: "POST" }
    );

    const data = await safeJson(res);

    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || "No se pudo denegar la propuesta.",
        data,
      };
    }

    updateProposalStatus(proposalId, "denied");

    return {
      ok: true,
      message: "Propuesta denegada.",
      data,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || "Fallo denegando propuesta.",
    };
  }
}

async function archiveProposal(req: Request, proposalId: string) {
  if (!proposalId) return { ok: false, error: "MISSING_PROPOSAL_ID" };

  try {
    const res = await callInternal(
      req,
      `/api/ora/autoprog/archive/${encodeURIComponent(proposalId)}`,
      { method: "POST" }
    );

    const data = await safeJson(res);

    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || "No se pudo archivar la propuesta.",
        data,
      };
    }

    updateProposalStatus(proposalId, "archived");

    return {
      ok: true,
      message: "Propuesta archivada.",
      data,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || "Fallo archivando propuesta.",
    };
  }
}

async function parseActionRequest(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    return {
      action: String(body?.action || "").trim() as KairosAction,
      proposalId: String(body?.proposalId || "").trim(),
    };
  }

  const formData = await req.formData().catch(() => null);

  return {
    action: String(formData?.get("action") || "").trim() as KairosAction,
    proposalId: String(formData?.get("proposalId") || "").trim(),
  };
}

export async function POST(req: Request) {
  try {
    const { action, proposalId } = await parseActionRequest(req);

    if (!action) {
      return respond(req, false, { error: "MISSING_ACTION" });
    }

    if (action === "scan-rafael") {
      const result = await runCouncilScan(req, "rafael");
      return respond(req, !!result.ok, result);
    }

    if (action === "scan-kaerliana") {
      const result = await runCouncilScan(req, "kaerliana");
      return respond(req, !!result.ok, result);
    }

    if (action === "scan-orion") {
      const result = await runCouncilScan(req, "orion");
      return respond(req, !!result.ok, result);
    }

    if (action === "scan-arturo") {
      const result = await runCouncilScan(req, "arturo");
      return respond(req, !!result.ok, result);
    }

    if (action === "scan-lucian") {
      const result = await runCouncilScan(req, "lucian");
      return respond(req, !!result.ok, result);
    }

    if (action === "scan-ignis") {
      const result = await runCouncilScan(req, "ignis");
      return respond(req, !!result.ok, result);
    }

    if (action === "scan-aelion") {
      const result = await runCouncilScan(req, "aelion");
      return respond(req, !!result.ok, result);
    }

    if (action === "scan-council") {
      const result = await runCouncilScan(req, "council");
      return respond(req, !!result.ok, result);
    }

    if (action === "detect") {
      const result = await runMotorAction(req, "detect");
      return respond(req, !!result.ok, result);
    }

    if (action === "meta-planner") {
      const result = await runMotorAction(req, "meta-planner");
      return respond(req, !!result.ok, result);
    }

    if (action === "supervisor") {
      const result = await runMotorAction(req, "supervisor");
      return respond(req, !!result.ok, result);
    }

    if (action === "auto-apply") {
      const result = await runMotorAction(req, "auto-apply");
      return respond(req, !!result.ok, result);
    }

    if (action === "loop") {
      const result = await runMotorAction(req, "loop");
      return respond(req, !!result.ok, result);
    }

    if (action === "apply") {
      const result = await applyProposal(req, proposalId);
      return respond(req, !!result.ok, result);
    }

    if (action === "deny") {
      const result = await denyProposal(req, proposalId);
      return respond(req, !!result.ok, result);
    }

    if (action === "archive") {
      const result = await archiveProposal(req, proposalId);
      return respond(req, !!result.ok, result);
    }

    return respond(req, false, { error: "UNKNOWN_ACTION", action });
  } catch (e: any) {
    return respond(req, false, {
      error: e?.message || "KAIROS_ACTION_FAIL",
    });
  }
}
