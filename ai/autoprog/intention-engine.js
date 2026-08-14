/**
 * KAIROS_LEGACY_INTENTION_ENGINE_RETIRED_V1
 *
 * Este motor histórico:
 * - escribía module-registry directamente;
 * - generaba filesystem directamente;
 * - persistía proposals por una ruta paralela.
 *
 * Toda intención estructural debe usar ahora
 * el Intent Engine TypeScript / ORA Core proposal-first.
 */
async function runIntentionEngine(_intent) {
  throw new Error(
    "LEGACY_INTENTION_MUTATION_ENGINE_RETIRED"
  );
}

module.exports = {
  runIntentionEngine
};
