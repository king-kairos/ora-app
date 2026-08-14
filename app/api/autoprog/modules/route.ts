export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

type ModuleRecord = {
  id: string;
  moduleName: string;
  title: string;
  branch: string;
  source: string;
  status: "active";
  createdAt: string;
};

const ROOT = process.cwd();
const ORA_DATA_DIR = path.join(ROOT, "ora-data");
const MODULE_REGISTRY_FILE = path.join(ORA_DATA_DIR, "module-registry.json");

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

function titleCaseWords(input: string) {
  return String(input || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function humanTitleFromSlug(slug: string) {
  return titleCaseWords(String(slug || "").replace(/[-_]/g, " "));
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

function branchFromIntent(intent: string): string {
  const value = String(intent || "").toLowerCase();

  if (value.includes("lottery")) return "lottery";

  if (value.includes("pollera") || value.includes("granja")) {
    return "personal-sovereign";
  }

  if (
    value.includes("inventario") ||
    value.includes("almacenes") ||
    value.includes("compras") ||
    value.includes("business") ||
    value.includes("supermercado") ||
    value.includes("ferreteria") ||
    value.includes("ferretería") ||
    value.includes("negocio")
  ) {
    return "commercial";
  }

  if (
    value.includes("charo") ||
    value.includes("aliado") ||
    value.includes("amigo") ||
    value.includes("socio")
  ) {
    return "allied";
  }

  if (value.includes("delivery")) return "delivery";
  if (value.includes("salud") || value.includes("medicina")) return "health";

  if (
    value.includes("camera") ||
    value.includes("camara") ||
    value.includes("cámara") ||
    value.includes("gateway") ||
    value.includes("eco")
  ) {
    return "public-gateway";
  }

  if (value.includes("social") || value.includes("community")) return "community";

  return "general";
}

function deriveModuleNameFromIntent(intent: string): string {
  const clean = String(intent || "")
    .replace(/^crear\s+m[oó]dulo\s+/i, "")
    .replace(/^crear\s+modulo\s+/i, "")
    .trim();

  return slugify(clean || intent) || `modulo-${Date.now()}`;
}

export async function GET() {
  try {
    const modules = await readJsonArray(MODULE_REGISTRY_FILE);

    return NextResponse.json({
      ok: true,
      modules,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "MODULES_READ_FAIL",
        modules: [],
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
 * POST ya NO puede materializar módulos.
 * La creación debe pasar por el Core soberano:
 *
 * intención -> proposal -> aprobación -> apply canónico -> registry
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    {
      ok: false,
      error: "DIRECT_MODULE_REGISTRY_WRITE_DISABLED",
      message:
        "La creación directa de módulos por esta ruta fue deshabilitada. Usa el flujo soberano proposal-first de Kairos.",
      executionMode: "proposal-first",
      materializationAuthority: "canonical-apply",
    },
    { status: 409 }
  );
}
