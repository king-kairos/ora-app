export type LegacyApplyResult = {
  ok: false;
  retired: true;
  error: "LEGACY_ENGINE_RETIRED";
  id: string;
  message: string;
  replacement: string;
};

/**
 * LEGACY_ENGINE_RETIRED
 *
 * Este motor aceptaba proposals pending y escribía
 * sin pasar por el motor soberano. Se conserva el
 * export solamente para compatibilidad temporal.
 */
export async function applyProposal(
  id: string
): Promise<LegacyApplyResult> {
  return {
    ok: false,
    retired: true,
    error: "LEGACY_ENGINE_RETIRED",
    id: String(id || ""),
    message:
      "El motor alternativo fue retirado. La proposal debe aprobarse y aplicarse mediante la Puerta Kairos.",
    replacement:
      "src/ai/autoprog/applyPatch.ts",
  };
}
