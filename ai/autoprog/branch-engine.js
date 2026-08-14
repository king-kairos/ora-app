/**
 * KAIROS_LEGACY_BRANCH_ENGINE_RETIRED_V1
 *
 * Este motor antiguo creaba filesystem + clone registry
 * fuera del lifecycle soberano.
 *
 * Se conserva solamente como stub fail-closed para impedir
 * que un require histórico reactive la mutación.
 */
function createBranch(_input) {
  throw new Error(
    "LEGACY_DIRECT_BRANCH_CREATION_RETIRED"
  );
}

module.exports = {
  createBranch
};
