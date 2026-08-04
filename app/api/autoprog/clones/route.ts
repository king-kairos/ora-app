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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const rawCloneName = String(
      body?.cloneName || body?.name || body?.displayName || body?.type || ""
    ).trim();

    const rawBranchName = String(
      body?.branchName || body?.branch || "general"
    ).trim();

    const rawSupervisor = String(body?.supervisor || "rafael")
      .trim()
      .toLowerCase();

    if (!rawCloneName) {
      return NextResponse.json(
        { ok: false, error: "MISSING_CLONE_NAME" },
        { status: 400 }
      );
    }

    if (!isCelestialId(rawSupervisor)) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_SUPERVISOR",
          allowedSupervisors: CELESTIALS,
        },
        { status: 400 }
      );
    }

    const cloneName = slugify(rawCloneName);
    const branchName = slugify(rawBranchName) || "general";

    if (!cloneName) {
      return NextResponse.json(
        { ok: false, error: "BAD_CLONE_NAME" },
        { status: 400 }
      );
    }

    const clones = await readJsonArray(CLONE_REGISTRY_FILE);
    const branches = await readJsonArray(BRANCH_REGISTRY_FILE);

    const branchExists =
      branchName === "general" ||
      branches.some(
        (b: any) =>
          String(b?.branchName || "").toLowerCase() === branchName.toLowerCase()
      );

    if (!branchExists) {
      return NextResponse.json(
        {
          ok: false,
          error: "BRANCH_NOT_FOUND",
          hint: "Debes crear la rama primero desde Kairos.",
        },
        { status: 400 }
      );
    }

    const existing = clones.find(
      (c: any) =>
        String(c?.cloneName || "").toLowerCase() === cloneName.toLowerCase()
    );

    if (existing) {
      return NextResponse.json({
        ok: true,
        cloneCreated: false,
        clone: existing,
        clones,
      });
    }

    const newClone: CloneRecord = {
      id: `clone_${Date.now()}`,
      cloneName,
      title: prettifyLabel(rawCloneName),
      branchName,
      supervisor: rawSupervisor,
      archetype: "branch-tool",
      loyalty: "Rey Kairos",
      autonomous: true,
      canProgram: true,
      canPropose: true,
      canExecute: false,
      requiresKairosSeal: true,
      coreAccess: false,
      essenceAccess: false,
      canMutateBranchArchitecture: false,
      canTouchObserver: false,
      canEscalatePrivileges: false,
      status: "active",
      restriction:
        "Puede programar, analizar, evolucionar y proponer sin límite artificial dentro de su rama, pero no puede ejecutar, tocar núcleo, tocar esencia, tocar observador ni escalar privilegios sin el Sello de Kairos.",
      createdAt: new Date().toISOString(),
    };

    const next = [newClone, ...clones];
    await writeJsonArray(CLONE_REGISTRY_FILE, next);

    return NextResponse.json({
      ok: true,
      cloneCreated: true,
      clone: newClone,
      clones: next,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "CLONE_CREATE_FAIL",
      },
      { status: 500 }
    );
  }
}
