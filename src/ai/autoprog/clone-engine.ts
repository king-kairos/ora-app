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

/**
 * KAIROS_DIRECT_CLONE_MUTATION_RETIRED_V1
 *
 * La materialización de clones pertenece exclusivamente
 * al commit posterior al Apply canónico.
 */
export function createClone(_type: CloneType) {
  throw new Error(
    "DIRECT_CLONE_REGISTRY_MUTATION_RETIRED"
  );
}

export function listClones() {
  const registry = readRegistry();

  return {
    ok: true,
    total: registry.length,
    clones: registry,
  };
}
