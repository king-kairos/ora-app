/**
 * DEPLOY_ENGINE_LEGACY_RETIRED
 *
 * Conservado temporalmente para detectar imports antiguos.
 * No ejecuta build, deploy, restart ni comandos del sistema.
 */
export async function runSovereignDeploy() {
  return {
    ok: false,
    retired: true,
    mode:
      "DEPLOY_ENGINE_LEGACY_RETIRED",
    error: "LEGACY_ENGINE_RETIRED",
    message:
      "Use safe-publish o system deploy protegidos por kairosExecutionGate.",
  };
}
