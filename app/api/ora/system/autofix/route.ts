export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const HISTORY_FILE = path.join(
  process.cwd(),
  "data",
  "system-actions",
  "history.jsonl"
);

const PATCH_DIR = path.join(
  process.cwd(),
  "data",
  "patches"
);

function hasValidSeal(req: Request) {
  const expected = String(process.env.KAIROS_SEAL || "").trim();

  if (!expected) return true;

  const received = String(
    req.headers.get("x-kairos-seal") || ""
  ).trim();

  return received === expected;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
}

function readHistory(limit = 20) {
  if (!fs.existsSync(HISTORY_FILE)) return [];

  const raw = fs.readFileSync(
    HISTORY_FILE,
    "utf8"
  ).trim();

  if (!raw) return [];

  return raw
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function buildFixProposal(error: string) {
  const lower = String(error || "").toLowerCase();

  if (
    lower.includes("module not found") ||
    lower.includes("cannot find module")
  ) {
    return {
      title: "Corregir import faltante",
      risk: "medium",
      suggestion:
        "Revisar imports y dependencias faltantes.",
    };
  }

  if (
    lower.includes("eslint") ||
    lower.includes("typescript")
  ) {
    return {
      title: "Corregir errores TypeScript/ESLint",
      risk: "low",
      suggestion:
        "Validar tipos y reglas antes del build.",
    };
  }

  if (
    lower.includes("next") ||
    lower.includes("hydration")
  ) {
    return {
      title: "Corregir problema frontend Next.js",
      risk: "medium",
      suggestion:
        "Revisar renderizado cliente/servidor.",
    };
  }

  return {
    title: "Revisión manual requerida",
    risk: "high",
    suggestion:
      "ORA detectó un error desconocido.",
  };
}

function createPatch(proposal: any) {
  ensureDir(PATCH_DIR);

  const id =
    "patch-" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 8);

  const patch = {
    id,
    status: "pending",
    createdAt: Date.now(),
    source: "autofix-engine",
    ...proposal,
  };

  const file = path.join(
    PATCH_DIR,
    `${id}.json`
  );

  fs.writeFileSync(
    file,
    JSON.stringify(patch, null, 2),
    "utf8"
  );

  return patch;
}

export async function POST(req: Request) {
  try {
    if (!hasValidSeal(req)) {
      return NextResponse.json(
        {
          ok: false,
          error: "SELLO_INVALIDO",
        },
        {
          status: 403,
        }
      );
    }

    const history = readHistory(30);

    const failed = history
      .filter((x) => x?.ok === false)
      .slice(-1)[0];

    if (!failed) {
      return NextResponse.json({
        ok: true,
        message:
          "No hay errores recientes para autofix.",
      });
    }

    const proposal = buildFixProposal(
      failed?.error || ""
    );

    const patch = createPatch({
      relatedError: failed?.error || "",
      ...proposal,
    });

    return NextResponse.json({
      ok: true,
      module: "autofix-engine",
      detectedError: failed?.error || "",
      patch,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "AUTOFIX_ENGINE_FAIL",
      },
      {
        status: 500,
      }
    );
  }
}
