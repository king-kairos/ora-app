import { detectImprovements } from "./detect-engine";
import { runAIProposalEngine } from "./ai-proposal-engine";
import { runMetaPlanner } from "./meta-planner";
import { runSupervisor } from "./supervisor-engine";
import { runAutoApplySafe } from "./auto-apply-engine";
import { runAutoprogPlanner } from "./autoprog-planner";

let loopRunning = false;
let loopStartedAt: string | null = null;
let cycleCount = 0;
let lastCycleAt: string | null = null;
let lastCycleSummary: Record<string, any> | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getSafeLoopStatus() {
  return {
    ok: true,
    running: loopRunning,
    startedAt: loopStartedAt,
    cycleCount,
    lastCycleAt,
    lastCycleSummary,
  };
}

export async function runSafeLoop() {
  if (loopRunning) {
    const status = getSafeLoopStatus();

    return {
      message: "ORA safe loop ya estaba corriendo",
      ...status,
    };
  }

  loopRunning = true;
  loopStartedAt = new Date().toISOString();

  console.log("[safe-loop] ORA safe loop iniciado");

  (async () => {
    while (loopRunning) {
      const cycleStartedAt = new Date().toISOString();

      try {
        console.log("[safe-loop] ciclo iniciado:", cycleStartedAt);

        const detect = await detectImprovements();
        console.log("[safe-loop] detect ok");

        const aiProposal = await runAIProposalEngine();
        console.log("[safe-loop] ai-proposal:", aiProposal?.created);

        const planner = await runMetaPlanner();
        console.log("[safe-loop] meta-planner ok");

        const supervisor = await runSupervisor();
        console.log("[safe-loop] supervisor ok");

        const autoApply = await runAutoApplySafe();
        console.log("[safe-loop] auto-apply ok");

        const autoprogPlanner = await runAutoprogPlanner();
        console.log(
          "[safe-loop] autoprog-planner:",
          autoprogPlanner?.selected?.moduleName || null
        );

        cycleCount += 1;
        lastCycleAt = new Date().toISOString();
        lastCycleSummary = {
          detectCreated: detect?.createdCount ?? 0,
          aiProposalCreated: aiProposal?.created ?? false,
          totalPending: planner?.totalPending ?? 0,
          supervisorSummary: supervisor?.summary ?? null,
          autoApplySummary: autoApply?.summary ?? null,
          plannerCreated: autoprogPlanner?.created ?? false,
          plannerSelected: autoprogPlanner?.selected?.moduleName ?? null,
        };

        console.log("[safe-loop] ciclo completado:", lastCycleSummary);
      } catch (error) {
        cycleCount += 1;
        lastCycleAt = new Date().toISOString();
        lastCycleSummary = {
          error:
            error instanceof Error
              ? error.message
              : "Fallo interno en safe-loop",
        };

        console.error("[safe-loop] error en ciclo:", error);
      }

      await sleep(60000);
    }
  })();

  const status = getSafeLoopStatus();

  return {
    message: "ORA safe loop iniciado",
    ...status,
  };
}

export function stopSafeLoop() {
  loopRunning = false;

  const status = getSafeLoopStatus();

  return {
    message: "ORA safe loop detenido",
    ...status,
  };
}
