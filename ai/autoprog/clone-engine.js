const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const CLONE_FILE = path.join(ROOT, "ora-data", "clone-registry.json");

function loadClones() {
  try {
    const raw = fs.readFileSync(CLONE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveClones(_clones) {
  throw new Error(
    "LEGACY_CLONE_REGISTRY_MUTATION_RETIRED"
  );
}

function createClone(_input) {
  throw new Error(
    "LEGACY_CLONE_CREATION_RETIRED"
  );
}

module.exports = {
  createClone,
  loadClones
};
