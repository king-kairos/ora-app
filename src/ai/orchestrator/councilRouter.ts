/*
 * Compatibilidad oficial del orquestador.
 *
 * La lógica central del Consejo vive en:
 * src/ai/council-engine/
 */

import {
  evaluateCouncil,
} from "../council-engine";

export type {
  CouncilDecision,
  CouncilVote,
} from "../council-engine";

export function councilEvaluate(
  intent: string
) {
  return evaluateCouncil(intent);
}
