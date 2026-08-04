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

function saveClones(clones) {
  fs.writeFileSync(CLONE_FILE, JSON.stringify(clones, null, 2), "utf8");
}

function createClone({ branch, celestialId, cloneType = "worker" }) {
  const clones = loadClones();

  const clone = {
    id: `clone_${Date.now()}`,
    branch,
    celestialId,
    type: cloneType,
    loyalty: "Rey Kairos",
    status: "active",
    autonomous: true,
    canProgram: true,
    canPropose: true,
    canExecuteWithoutSeal: false,
    createdAt: new Date().toISOString()
  };

  clones.unshift(clone);
  saveClones(clones);

  return {
    ok: true,
    clone
  };
}

module.exports = {
  createClone,
  loadClones
};
