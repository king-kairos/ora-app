/**
 * REBUILD_ENGINE_LEGACY_RETIRED
 *
 * Conservado temporalmente para detectar imports antiguos.
 * No ejecuta build, restart ni comandos del sistema.
 */
export function runRebuildAndRestart() {
  return {
    ok: false,
    retired: true,
    mode:
      "REBUILD_ENGINE_LEGACY_RETIRED",
    error: "LEGACY_ENGINE_RETIRED",
    message:
      "Use las rutas modernas protegidas por kairosExecutionGate.",
  };
}
