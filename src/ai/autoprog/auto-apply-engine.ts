export type AutoApplyRetiredResult = {
  ok: false;
  retired: true;
  mode: "AUTO_APPLY_ENGINE_RETIRED";
  error: "AUTONOMOUS_MUTATION_DISABLED";
  summary: {
    applied: 0;
    skipped: 0;
    failed: 0;
  };
  message: string;
  replacement: string;
};

/**
 * El safe-loop puede continuar observando y
 * proponiendo, pero ya no aplica cambios solo.
 */
export async function runAutoApplySafe():
Promise<AutoApplyRetiredResult> {
  return {
    ok: false,
    retired: true,
    mode:
      "AUTO_APPLY_ENGINE_RETIRED",
    error:
      "AUTONOMOUS_MUTATION_DISABLED",
    summary: {
      applied: 0,
      skipped: 0,
      failed: 0,
    },
    message:
      "Auto-apply fue neutralizado. Toda aplicación requiere aprobación y Sello Kairos explícito.",
    replacement:
      "/api/kairos/autoprog/apply",
  };
}
