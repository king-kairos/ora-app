export type ApplyPatchResult = {
  ok: false;
  retired: true;
  error: "LEGACY_ENGINE_RETIRED";
  message: string;
  replacement: string;
};

/**
 * LEGACY_ENGINE_RETIRED
 *
 * Conserva temporalmente el export para evitar
 * fallos de importación en código histórico.
 * No lee proposals, no crea backups y no escribe.
 */
export function applyProposalPatch(
  _proposalId: string
): ApplyPatchResult {
  return {
    ok: false,
    retired: true,
    error: "LEGACY_ENGINE_RETIRED",
    message:
      "El motor antiguo fue retirado. Use el motor applyPatch soberano.",
    replacement:
      "src/ai/autoprog/applyPatch.ts",
  };
}
