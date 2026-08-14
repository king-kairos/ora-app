/**
 * KAIROS_LEGACY_MODULE_BUILDER_RETIRED_V1
 *
 * La creación directa de app/<module>/page.tsx
 * fue retirada. Todo cambio estructural debe vivir
 * dentro de una proposal y pasar por Apply canónico.
 */
function createModule(_name) {
  throw new Error(
    "LEGACY_DIRECT_MODULE_BUILD_RETIRED"
  );
}

module.exports = {
  createModule
};
