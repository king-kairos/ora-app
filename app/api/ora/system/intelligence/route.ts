export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const HISTORY_FILE = path.join(
  process.cwd(),
  "data",
  "system-actions",
  "history.jsonl"
);

function hasValidSeal(req: Request) {
  const expected = String(process.env.KAIROS_SEAL || "").trim();
  if (!expected) return false;

  const received = String(req.headers.get("x-kairos-seal") || "").trim();
  return received === expected;
}

function readHistory(limit = 30) {
  if (!fs.existsSync(HISTORY_FILE)) return [];

  const raw = fs.readFileSync(HISTORY_FILE, "utf8").trim();
  if (!raw) return [];

  return raw
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function analyzeHistory(items: any[]) {
  const total = items.length;
  const failed = items.filter((x) => x?.ok === false);
  const success = items.filter((x) => x?.ok === true);

  const recentActions = items.map((x) => x?.action).filter(Boolean);

  const restartFrontCount = recentActions.filter(
    (x) => x === "restart_front"
  ).length;

  const restartCoreCount = recentActions.filter(
    (x) => x === "restart_core"
  ).length;

  const deployCount = recentActions.filter(
    (x) => x === "deploy_full"
  ).length;

  const buildCount = recentActions.filter(
    (x) => x === "build"
  ).length;

  const avgDuration =
    success.length > 0
      ? Math.round(
          success.reduce(
            (sum, x) => sum + Number(x?.durationMs || 0),
            0
          ) / success.length
        )
      : 0;

  const alerts: string[] = [];
  const recommendations: string[] = [];

  if (failed.length > 0) {
    alerts.push(`Hay ${failed.length} acciones fallidas recientes.`);
    recommendations.push("Revisar logs_front y logs_core antes de otro deploy.");
  }

  if (restartFrontCount >= 3) {
    alerts.push("Frontend reiniciado varias veces recientemente.");
    recommendations.push("Revisar si hay errores recurrentes de Next.js o hydration.");
  }

  if (restartCoreCount >= 3) {
    alerts.push("Core reiniciado varias veces recientemente.");
    recommendations.push("Revisar logs_core y memoria del proceso ora.");
  }

  if (deployCount >= 2) {
    recommendations.push("Después de varios deploys, ejecutar pm2_status para validar estabilidad.");
  }

  if (buildCount >= 2) {
    recommendations.push("Si el build tarda demasiado, revisar dependencias y rutas generadas.");
  }

  if (alerts.length === 0) {
    alerts.push("No hay alertas críticas detectadas en el historial reciente.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Sistema estable. Mantener observación normal.");
  }

  return {
    total,
    success: success.length,
    failed: failed.length,
    avgDurationMs: avgDuration,
    recentActions,
    alerts,
    recommendations,
    state:
      failed.length > 0
        ? "attention"
        : restartFrontCount >= 3 || restartCoreCount >= 3
        ? "watch"
        : "stable",
  };
}

export async function GET(req: Request) {
  try {
    if (!hasValidSeal(req)) {
      return NextResponse.json(
        { ok: false, error: "SELLO_INVALIDO" },
        { status: 403 }
      );
    }

    const items = readHistory(40);
    const analysis = analyzeHistory(items);

    return NextResponse.json({
      ok: true,
      module: "system-intelligence",
      analysis,
      lastItems: items.slice(-10),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "SYSTEM_INTELLIGENCE_FAIL",
      },
      { status: 500 }
    );
  }
}
