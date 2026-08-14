export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

type CelestialId =
  | "kaerliana"
  | "rafael"
  | "arturo"
  | "orion"
  | "lucian"
  | "ignis"
  | "aelion";

type CloneRecord = {
  id: string;
  cloneName: string;
  title: string;
  branchName: string;
  supervisor: CelestialId;
  archetype: "branch-tool";
  loyalty: "Rey Kairos";
  autonomous: true;
  canProgram: true;
  canPropose: true;
  canExecute: false;
  requiresKairosSeal: true;
  coreAccess: false;
  essenceAccess: false;
  canMutateBranchArchitecture: false;
  canTouchObserver: false;
  canEscalatePrivileges: false;
  status: "active";
  restriction: string;
  createdAt: string;
};

const ROOT = process.cwd();
const ORA_DATA_DIR = path.join(ROOT, "ora-data");
const CLONE_REGISTRY_FILE = path.join(ORA_DATA_DIR, "clone-registry.json");
const BRANCH_REGISTRY_FILE = path.join(ORA_DATA_DIR, "branch-registry.json");

const CELESTIALS: CelestialId[] = [
  "kaerliana",
  "rafael",
  "arturo",
  "orion",
  "lucian",
  "ignis",
  "aelion",
];

function slugify(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function prettifyLabel(input: string) {
  return String(input || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isCelestialId(x: string): x is CelestialId {
  return CELESTIALS.includes(String(x || "").toLowerCase() as CelestialId);
}

async function readJsonArray(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJsonArray(filePath: string, value: any[]) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

export async function GET() {
  try {
    const clones = await readJsonArray(CLONE_REGISTRY_FILE);

    return NextResponse.json({
      ok: true,
      celestialSupervisors: CELESTIALS,
      clones,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "CLONES_READ_FAIL",
        clones: [],
      },
      { status: 500 }
    );
  }
}

/**
 * KAIROS_REGISTRY_READ_ONLY_GATE_V1
 *
 * Este endpoint conserva GET como lectura del registry materializado.
 *
 * POST ya NO puede materializar clones.
 * La creación debe pasar por el Core soberano:
 *
 * intención -> proposal -> aprobación -> apply canónico -> registry
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    {
      ok: false,
      error: "DIRECT_CLONE_REGISTRY_WRITE_DISABLED",
      message:
        "La creación directa de clones por esta ruta fue deshabilitada. Usa el flujo soberano proposal-first de Kairos.",
      executionMode: "proposal-first",
      materializationAuthority: "canonical-apply",
    },
    { status: 409 }
  );
}
