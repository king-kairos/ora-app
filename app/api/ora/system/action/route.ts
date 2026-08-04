// app/api/ora/system/action/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const run = promisify(exec);

/* =========================
   CONFIG
========================= */

const HISTORY_DIR = path.join(
  process.cwd(),
  "data",
  "system-actions"
);

const HISTORY_FILE = path.join(
  HISTORY_DIR,
  "history.jsonl"
);

/* =========================
   SEAL
========================= */

function hasValidSeal(req: Request) {
  const expected = String(process.env.KAIROS_SEAL || "").trim();

  if (!expected) return true;

  const received = String(
    req.headers.get("x-kairos-seal") || ""
  ).trim();

  return received === expected;
}

/* =========================
   ACTIONS
========================= */

const ACTIONS: Record<string, string> = {
  build: "npm run build",

  restart_front: "pm2 restart ora-front",

  restart_core: "pm2 restart ora",

  pm2_status: "pm2 status",

  logs_front: "pm2 logs ora-front --lines 80 --nostream",

  logs_core: "pm2 logs ora --lines 80 --nostream",

  deploy_full:
    "npm run build && pm2 restart ora-front && pm2 restart ora",
};

/* =========================
   INTENT → ACTION
========================= */

function normalizeText(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveActionFromIntent(input: string) {
  const text = normalizeText(input);
  if (!text) return "";
  if (
    text.includes("pm2") ||
    text.includes("status") ||
    text.includes("estado") ||
    text.includes("procesos")
  ) {
    return "pm2_status";
  }
  if (
    text.includes("build") ||
    text.includes("compila") ||
    text.includes("compilar") ||
    text.includes("construir")
  ) {
    return "build";
  }
  if (
    text.includes("reinicia frontend") ||
    text.includes("restart front") ||
    text.includes("ora-front") ||
    text.includes("frontend")
  ) {
    return "restart_front";
  }
  if (
    text.includes("reinicia core") ||
    text.includes("restart core") ||
    text.includes("backend") ||
    text.includes("servidor") ||
    text.includes("ora core")
  ) {
    return "restart_core";
  }
  if (
    text.includes("deploy") ||
    text.includes("publica") ||
    text.includes("publicar") ||
    text.includes("sube cambios") ||
    text.includes("actualiza produccion")
  ) {
    return "deploy_full";
  }
  if (
    text.includes("logs front") ||
    text.includes("log front") ||
    text.includes("logs frontend") ||
    text.includes("errores frontend")
  ) {
    return "logs_front";
  }
  if (
    text.includes("logs core") ||
    text.includes("log core") ||
    text.includes("logs backend") ||
    text.includes("errores backend")
  ) {
    return "logs_core";
  }
  return "";
}

/* =========================
   HISTORY
========================= */

function ensureHistoryDir() {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, {
      recursive: true,
    });
  }
}

function appendHistory(entry: any) {
  ensureHistoryDir();

  fs.appendFileSync(
    HISTORY_FILE,
    JSON.stringify(entry) + "\n",
    "utf8"
  );
}

/* =========================
   COMMAND
========================= */

async function runCommand(command: string) {
  const startedAt = Date.now();

  const { stdout, stderr } = await run(command, {
    cwd: process.cwd(),
    timeout: 1000 * 60 * 5,
    maxBuffer: 1024 * 1024 * 10,
  });

  const finishedAt = Date.now();

  return {
    command,
    stdout,
    stderr,
    durationMs: finishedAt - startedAt,
    finishedAt,
  };
}

/* =========================
   POST
========================= */

export async function POST(req: Request) {
  try {
    if (!hasValidSeal(req)) {
      appendHistory({
        ts: Date.now(),
        ok: false,
        type: "INVALID_SEAL",
      });

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

    const body = await req.json().catch(() => ({}));

    const rawAction = String(body?.action || "").trim();
    const input = String(body?.input || body?.intent || body?.message || "").trim();
    const action = rawAction || resolveActionFromIntent(input);

    if (!action) {
      return NextResponse.json(
        {
          ok: false,
          error: "ACTION_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    const command = ACTIONS[action];

    if (!command) {
      return NextResponse.json(
        {
          ok: false,
          error: "ACTION_NOT_ALLOWED",
          allowed: Object.keys(ACTIONS),
        },
        {
          status: 400,
        }
      );
    }

    const result = await runCommand(command);

    appendHistory({
      ts: Date.now(),
      ok: true,
      action,
      command,
      durationMs: result.durationMs,
    });

    return NextResponse.json({
      ok: true,
      action,
      result,
    });
  } catch (error: any) {
    appendHistory({
      ts: Date.now(),
      ok: false,
      error: error?.message || "SYSTEM_ACTION_FAIL",
    });

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "SYSTEM_ACTION_FAIL",

        stdout: error?.stdout || "",

        stderr: error?.stderr || "",
      },
      {
        status: 500,
      }
    );
  }
}
