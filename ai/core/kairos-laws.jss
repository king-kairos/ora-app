const CORE_LAWS = {
  coreProtected: true,

  // soberanía absoluta
  sovereign: "kairos",

  // esencias del núcleo
  celestialKnights: [
    "rafael",
    "kaerliana",
    "orion",
    "arturo"
  ],

  // reglas del sistema
  rules: {

    // ramas no pueden tocar núcleo
    branchCanModifyCore: false,

    // clones no pueden tocar esencias
    cloneCanModifyEssence: false,

    // autoprog no toca núcleo
    autoprogCanModifyCore: false,

    // solo Kairos puede ejecutar cambios críticos
    requireKairosSealForCoreMutation: true,

    // caballeros pueden modificar núcleo si Kairos autoriza
    celestialCanModifyCoreWithSeal: true

  }
};

module.exports = CORE_LAWS;
