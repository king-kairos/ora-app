const CORE_LAWS = require("./kairos-laws");

function protectCoreMutation({ actor, target, hasKairosSeal }) {

  if (!CORE_LAWS.coreProtected) {
    return { allowed: true };
  }

  // si se intenta modificar núcleo
  if (target === "core") {

    if (!hasKairosSeal) {
      return {
        allowed: false,
        reason: "Kairos seal required"
      };
    }

    // Kairos siempre puede
    if (actor === "kairos") {
      return { allowed: true };
    }

    // caballeros pueden con sello
    if (CORE_LAWS.celestialKnights.includes(actor)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "branches cannot modify core"
    };
  }

  // si se intenta modificar esencia
  if (target === "essence") {

    if (actor === "kairos") {
      return { allowed: true };
    }

    if (CORE_LAWS.celestialKnights.includes(actor)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "clones cannot modify essence"
    };
  }

  return { allowed: true };
}

module.exports = {
  protectCoreMutation
};
