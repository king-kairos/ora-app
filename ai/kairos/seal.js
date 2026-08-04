const KAIROS_SEAL = process.env.KAIROS_SEAL || "";

function verifySeal(req) {

  const seal = req.headers["x-kairos-seal"];

  if (!seal) {
    return false;
  }

  return seal === KAIROS_SEAL;
}

module.exports = {
  verifySeal
};
