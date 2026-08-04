import { runIntentEngine } from "./intent-engine";
import { getNextEvolutionCandidates } from "./evolution-graph";

export async function runAutoprogPlanner() {
  const candidates = getNextEvolutionCandidates();

  if (!candidates.next) {
    return {
      ok: true,
      created: false,
      totalReady: candidates.totalReady,
      message: "ORA no detectó módulos listos para crear en este ciclo.",
      candidates,
    };
  }

  const next = candidates.next;
  const intentText = `crear módulo ${next.moduleName}`;
  const generated = await runIntentEngine({ intent: intentText });

  return {
    ok: true,
    created: generated?.ok ?? false,
    selected: next,
    candidates,
    generated,
    message: `ORA evaluó el grafo evolutivo y priorizó la creación del módulo ${next.moduleName}.`,
  };
}
