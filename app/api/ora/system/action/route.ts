// app/api/ora/system/action/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { authorizeKairosExecution } from "../../../../../src/security/kairosExecutionGate";

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
   ACTIONS
========================= */

const ACTIONS: Record<string, string> = {
  build:
    "__KAIROS_CANONICAL_BUILD__",

  restart_front: "pm2 restart ora-front",

  restart_core: "pm2 restart ora",

  pm2_status: "pm2 status",

  logs_front: "pm2 logs ora-front --lines 80 --nostream",

  logs_core: "pm2 logs ora --lines 80 --nostream",

  /*
   * deploy_full permanece como comando de cabina,
   * pero YA NO contiene un ejecutor propio.
   *
   * Su ejecución real se delega posteriormente
   * al endpoint canónico /api/ora/system/deploy.
   */
  deploy_full:
    "__KAIROS_CANONICAL_DEPLOY__",
};

const READ_ONLY_ACTIONS = new Set([
  "pm2_status",
  "logs_front",
  "logs_core",
]);

function executionGateAction(action: string) {
  switch (action) {
    case "build":
      return "modify_runtime" as const;

    case "restart_front":
      return "restart_front" as const;

    case "restart_core":
      return "restart_core" as const;

    case "deploy_full":
      return "deploy" as const;

    default:
      return null;
  }
}

function isReadOnlyAction(action: string) {
  return READ_ONLY_ACTIONS.has(action);
}

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

/*
 * SELF-RESTART SOBERANO
 *
 * restart_front reinicia el mismo proceso que atiende
 * esta petición. Ejecutarlo con await/exec puede matar
 * la conexión antes de entregar la respuesta y producir
 * un falso HTTP 500 aunque PM2 sí haya reiniciado.
 *
 * La autorización ocurre ANTES en POST mediante
 * authorizeKairosExecution(req, "restart_front").
 *
 * Aquí solamente se difiere el efecto ya autorizado.
 */
function scheduleFrontRestart() {
  const child = spawn(
    "bash",
    [
      "-lc",
      "sleep 2; pm2 restart ora-front --update-env >/tmp/kairos-system-action-restart-front.log 2>&1",
    ],
    {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
    }
  );

  child.unref();
}

/* =========================
   POST
========================= */

export async function POST(req: Request) {
  try {
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

    const readOnly = isReadOnlyAction(action);
    const gateAction = executionGateAction(action);

    if (!readOnly) {
      if (!gateAction) {
        return NextResponse.json(
          {
            ok: false,
            error: "EXECUTION_ACTION_NOT_MAPPED",
            action,
          },
          {
            status: 500,
          }
        );
      }

      const authorization = authorizeKairosExecution(
        req,
        gateAction
      );

      if (!authorization.ok) {
        return NextResponse.json(
          {
            ok: false,
            action,
            executionAction:
              authorization.action,
            error:
              authorization.error,
          },
          {
            status:
              authorization.status,
          }
        );
      }
    }

    /*
     * FRONTERA ÚNICA DE BUILD AISLADO
     *
     * SYSTEM ACTION conserva la acción "build"
     * para compatibilidad con Builder y Control Panel,
     * pero ya no ejecuta npm directamente.
     *
     * Delega al único ejecutor de build aislado:
     *
     *   /api/kairos/autoprog/build-validate
     *
     * El mismo sello recibido se reenvía y el endpoint
     * canónico vuelve a validar modify_runtime.
     */
    if (action === "build") {
      const receivedSeal = String(
        req.headers.get("x-kairos-seal") ||
        req.headers.get("kairos-seal") ||
        ""
      ).trim();

      const buildResponse = await fetch(
        "http://127.0.0.1:3000/api/kairos/autoprog/build-validate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            "x-kairos-seal":
              receivedSeal,
          },
          body: JSON.stringify({
            source:
              "system-action",
          }),
          cache:
            "no-store",
        }
      );

      const buildText =
        await buildResponse.text();

      let buildData: any = {};

      try {
        buildData =
          buildText
            ? JSON.parse(buildText)
            : {};
      } catch {
        buildData = {
          raw: buildText,
        };
      }

      appendHistory({
        ts: Date.now(),
        ok:
          buildResponse.ok &&
          buildData?.ok !== false,
        action,
        command:
          "CANONICAL:/api/kairos/autoprog/build-validate",
        delegated:
          true,
        canonicalBuild:
          true,
        status:
          buildResponse.status,
      });

      return NextResponse.json(
        {
          ...buildData,
          delegatedBy:
            "/api/ora/system/action",
          requestedAction:
            "build",
          canonicalBuild:
            true,
          canonicalEndpoint:
            "/api/kairos/autoprog/build-validate",
        },
        {
          status:
            buildResponse.status,
        }
      );
    }

    /*
     * FRONTERA ÚNICA DE DEPLOY
     *
     * SYSTEM ACTION puede recibir la orden deploy_full,
     * pero no ejecuta build/restart por sí mismo.
     *
     * Reenvía EXACTAMENTE el sello recibido a
     * /api/ora/system/deploy.
     *
     * No lee KAIROS_SEAL desde process.env.
     * No fabrica autoridad.
     * El endpoint canónico vuelve a validar el Gate.
     */
    if (action === "deploy_full") {
      const receivedSeal = String(
        req.headers.get("x-kairos-seal") ||
        req.headers.get("kairos-seal") ||
        ""
      ).trim();

      const deployResponse = await fetch(
        "http://127.0.0.1:3000/api/ora/system/deploy",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-kairos-seal": receivedSeal,
          },
          body: JSON.stringify({}),
          cache: "no-store",
        }
      );

      const deployText =
        await deployResponse.text();

      let deployData: any = {};

      try {
        deployData =
          deployText
            ? JSON.parse(deployText)
            : {};
      } catch {
        deployData = {
          raw: deployText,
        };
      }

      appendHistory({
        ts: Date.now(),
        ok:
          deployResponse.ok &&
          deployData?.ok !== false,
        action,
        command:
          "CANONICAL:/api/ora/system/deploy",
        delegated: true,
        canonicalDeploy: true,
        status:
          deployResponse.status,
      });

      return NextResponse.json(
        {
          ...deployData,
          delegatedBy:
            "/api/ora/system/action",
          requestedAction:
            "deploy_full",
          canonicalEndpoint:
            "/api/ora/system/deploy",
        },
        {
          status:
            deployResponse.status,
        }
      );
    }

    /*
     * restart_front es un self-restart.
     *
     * El Gate ya autorizó restart_front arriba.
     * Se responde primero y el reinicio ocurre
     * fuera del ciclo de vida de esta petición.
     */
    if (action === "restart_front") {
      scheduleFrontRestart();

      appendHistory({
        ts: Date.now(),
        ok: true,
        action,
        command:
          "DETACHED:pm2 restart ora-front --update-env",
        scheduled: true,
      });

      return NextResponse.json(
        {
          ok: true,
          action,
          executionAction:
            "restart_front",
          scheduled: true,
          detached: true,
          delayMs: 2000,
          message:
            "Reinicio de ora-front autorizado y programado fuera de la petición.",
        },
        {
          status: 202,
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
