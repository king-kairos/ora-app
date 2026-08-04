import fs from "fs";
import path from "path";
import { runSupervisor } from "./supervisor-engine";
import { applyProposal } from "./apply-engine";

type AutoApplyResult = {
  id: string;
  status: "applied" | "skipped" | "failed";
  reason: string;
};

function isSensitiveTarget(targetFile?: string) {
  const value = String(targetFile || "").toLowerCase();

  return (
    value.includes("security") ||
    value.includes("kairos") ||
    value.includes("seal") ||
    value.includes("patch-secret") ||
    value.includes("soberania")
  );
}

function appendHistory(entry: Record<string, any>) {
  const historyDir = path.join(process.cwd(), "ora-data", "history");

  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const filePath = path.join(
    historyDir,
    `auto_apply_${Date.now()}_${Math.random().toString(16).slice(2, 8)}.json`
  );

  fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), "utf8");
}

export async function runAutoApplySafe() {
  const supervisor = await runSupervisor();
  const safeList = Array.isArray(supervisor.safe) ? supervisor.safe : [];

  const results: AutoApplyResult[] = [];

  for (const item of safeList) {
    const id = String(item.id || "sin-id");
    const risk = String(item.risk || "");
    const targetFile = String(item.targetFile || "");

    if (risk !== "low") {
      results.push({
        id,
        status: "skipped",
        reason: "No es risk low",
      });
      continue;
    }

    if (isSensitiveTarget(targetFile)) {
      results.push({
        id,
        status: "skipped",
        reason: "Target sensible bloqueado por seguridad",
      });
      continue;
    }

    try {
      const applyResult = await applyProposal(id);

      results.push({
        id,
        status: applyResult?.ok ? "applied" : "failed",
        reason: applyResult?.ok
          ? "Aplicada automáticamente por auto-apply seguro"
          : "Falló applyProposal",
      });

    } catch (error) {
      results.push({
        id,
        status: "failed",
        reason: error instanceof Error ? error.message : "Fallo interno",
      });
    }
  }

  const summary = {
    applied: results.filter((r) => r.status === "applied").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
  };

  const payload = {
    ok: true,
    createdAt: new Date().toISOString(),
    totalSafeCandidates: safeList.length,
    summary,
    results,
    message:
      "Auto-apply seguro ejecutado: ORA intentó aplicar únicamente propuestas safe, low-risk y no sensibles.",
  };

  appendHistory({
    type: "auto-apply-safe",
    ...payload,
  });

  return payload;
}
