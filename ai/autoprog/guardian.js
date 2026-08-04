const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const CELESTIAL_FILE = path.join(ROOT, "ora-data", "core", "celestial-registry.json");

const PROTECTED_PATHS = [
  "/src/ai/router",
  "/src/ai/security",
  "/src/ai/memory",
  "/src/ai/autoprog",
  "/ora-data/core"
];

function loadCelestials() {
  try {
    const raw = fs.readFileSync(CELESTIAL_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { celestials: [] };
  }
}

function pathTouchesProtected(filePath) {
  return PROTECTED_PATHS.some((p) => String(filePath || "").includes(p));
}

function patchTouchesCelestial(filePath) {
  const data = loadCelestials();
  const celestials = Array.isArray(data.celestials) ? data.celestials : [];
  return celestials.some((c) => String(filePath || "").toLowerCase().includes(String(c.id || "").toLowerCase()));
}

function validatePatch(patch) {
  if (!patch || !Array.isArray(patch.files)) {
    return { allowed: false, reason: "PATCH_INVALID" };
  }

  for (const file of patch.files) {
    const p = String(file?.path || "");

    if (pathTouchesProtected(p)) {
      return {
        allowed: false,
        reason: "PATCH_TOUCHES_PROTECTED_CORE"
      };
    }

    if (patchTouchesCelestial(p)) {
      return {
        allowed: false,
        reason: "PATCH_TOUCHES_CELESTIAL"
      };
    }
  }

  return { allowed: true };
}

module.exports = {
  validatePatch
};
