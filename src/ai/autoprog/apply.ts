export type RetiredAutoprogApplyResult = {
  ok: false;
  retired: true;
  error:
    "LEGACY_ENGINE_RETIRED";
  mode:
    "AUTOPROG_APPLY_ALTERNATIVE_RETIRED";
  replacement: string;
  requiredAction:
    "apply_patch";
  kairosGateRequired:
    true;
  proposalMustBeApproved:
    true;
};

/**
 * LEGACY_ENGINE_RETIRED
 *
 * Este controlador Express alternativo escribía y eliminaba
 * archivos directamente usando una validación local de sello.
 *
 * Fue neutralizado para impedir que exista una segunda
 * autoridad de mutación fuera del motor soberano.
 */
export async function autoprogApply(
  _req?: unknown,
  res?: any
): Promise<
  RetiredAutoprogApplyResult | unknown
> {
  const result:
    RetiredAutoprogApplyResult = {
      ok: false,
      retired: true,
      error:
        "LEGACY_ENGINE_RETIRED",
      mode:
        "AUTOPROG_APPLY_ALTERNATIVE_RETIRED",
      replacement:
        "src/ai/autoprog/applyPatch.ts",
      requiredAction:
        "apply_patch",
      kairosGateRequired:
        true,
      proposalMustBeApproved:
        true,
    };

  if (
    res &&
    typeof res.status === "function" &&
    typeof res.json === "function"
  ) {
    return res
      .status(410)
      .json(result);
  }

  return result;
}
