import fs from "fs";
import path from "path";

type CloneType =
  | "builder"
  | "analysis"
  | "planner"
  | "security"
  | "module";

type Clone = {
  id: string;
  type: CloneType;
  createdAt: string;
  loyalty: "celestial";
  status: "active";
};

const registryFile = path.join(
  process.cwd(),
  "ora-data",
  "clone-registry.json"
);

function readRegistry(): Clone[] {
  if (!fs.existsSync(registryFile)) return [];
  try {
    const raw = fs.readFileSync(registryFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeRegistry(data: Clone[]) {
  fs.writeFileSync(registryFile, JSON.stringify(data, null, 2));
}

export function createClone(type: CloneType) {
  const registry = readRegistry();

  const clone: Clone = {
    id: "clone_" + Date.now(),
    type,
    createdAt: new Date().toISOString(),
    loyalty: "celestial",
    status: "active",
  };

  registry.push(clone);

  writeRegistry(registry);

  return {
    ok: true,
    clone,
    totalClones: registry.length,
  };
}

export function listClones() {
  const registry = readRegistry();

  return {
    ok: true,
    total: registry.length,
    clones: registry,
  };
}
