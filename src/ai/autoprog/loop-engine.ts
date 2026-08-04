import { runObservatoryScan } from "./observatory-engine";
import { detectImprovements } from "./detect-engine";
import { runMetaPlanner } from "./meta-planner";

export async function runAutoprogLoop() {
  const startedAt = new Date().toISOString();

  const observatory = await runObservatoryScan();
  const detect = await detectImprovements();
  const planner = await runMetaPlanner();

  const finishedAt = new Date().toISOString();

  return {
    ok: true,
    mode: "safe-loop",
    startedAt,
    finishedAt,
    observatory: {
      scannedAt: observatory.scannedAt,
      stats: observatory.stats,
      warnings: observatory.warnings,
    },
    detect: {
      createdCount: detect.createdCount,
      created: detect.created,
    },
    planner: {
      totalPending: planner.totalPending,
      totalPlanned: planner.totalPlanned,
      summary: planner.summary,
      ordered: planner.ordered,
    },
    message:
      "Loop seguro ejecutado: ORA escaneó, detectó mejoras y priorizó propuestas sin aplicar cambios.",
  };
}
