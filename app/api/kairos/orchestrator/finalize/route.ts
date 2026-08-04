export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import { promisify } from "util";

import {
  readOperation,
  updateOperation,
} from "@/kairos/orchestrator/engine";

const run = promisify(exec);

function validSeal(req: Request) {
  const expected = String(
    process.env.KAIROS_SEAL || ""
  ).trim();

  if (!expected) return true;

  const received = String(
    req.headers.get("x-kairos-seal") || ""
  ).trim();

  return received === expected;
}

function scheduleRestart() {
  const child = spawn(
    "bash",
    [
      "-lc",
      "sleep 2; pm2 restart ora-front --update-env >/tmp/kairos-orchestrator-restart.log 2>&1",
    ],
    {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
    }
  );

  child.unref();
}

export async function POST(req: Request) {
  let operationId = "";

  try {
    if (!validSeal(req)) {
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

    const body = await req
      .json()
      .catch(() => ({}));

    operationId = String(
      body?.operationId || ""
    ).trim();

    if (!operationId) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPERATION_ID_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    const operation =
      await readOperation(operationId);

    if (!operation) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPERATION_NOT_FOUND",
        },
        {
          status: 404,
        }
      );
    }

    if (
      operation.stage !== "applied" &&
      operation.stage !== "build_pending"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "OPERATION_NOT_READY_FOR_BUILD",
          operation,
        },
        {
          status: 409,
        }
      );
    }

    await updateOperation(
      operationId,
      "build_pending",
      "running",
      "Build requerido por el plan de aplicación."
    );

    await updateOperation(
      operationId,
      "building",
      "running",
      "Ejecutando npm run build."
    );

    const build = await run(
      "npm run build",
      {
        cwd: process.cwd(),
        timeout: 1000 * 60 * 10,
        maxBuffer: 1024 * 1024 * 25,
      }
    ).then(
      (result) => ({
        ok: true,
        stdout: String(
          result.stdout || ""
        ).slice(-10000),
        stderr: String(
          result.stderr || ""
        ).slice(-10000),
      }),
      (error: any) => ({
        ok: false,
        stdout: String(
          error?.stdout || ""
        ).slice(-10000),
        stderr: String(
          error?.stderr ||
            error?.message ||
            ""
        ).slice(-10000),
      })
    );

    if (!build.ok) {
      await updateOperation(
        operationId,
        "recovery-pending",
        "failed",
        "Build falló. Backup preservado; se requiere reparación autorizada."
      );

      return NextResponse.json(
        {
          ok: false,
          mode:
            "KAIROS_ORCHESTRATOR_BUILD_FAILED",
          operationId,
          build,
          next:
            "AUTO_REPAIR_OR_MANUAL_CORRECTION_REQUIRED",
        },
        {
          status: 409,
        }
      );
    }

    await updateOperation(
      operationId,
      "build_passed",
      "running",
      "Build validado correctamente."
    );

    await updateOperation(
      operationId,
      "restart_pending",
      "running",
      "Reinicio controlado de ora-front programado."
    );

    scheduleRestart();

    await updateOperation(
      operationId,
      "restarting",
      "running",
      "ora-front se reiniciará fuera de esta petición."
    );

    return NextResponse.json({
      ok: true,
      mode:
        "KAIROS_ORCHESTRATOR_UPDATE_158_BUILD",
      operationId,
      proposalId:
        operation.proposalId,
      buildPassed: true,
      restartScheduled: true,
      verifyAfterSeconds: 8,
      nextEndpoint:
        "/api/kairos/orchestrator/verify",
      build,
      message:
        "Build aprobado. Reinicio programado; ejecutar verify después de 8 segundos.",
    });
  } catch (error: any) {
    if (operationId) {
      await updateOperation(
        operationId,
        "recovery-pending",
        "failed",
        error?.message ||
          "ORCHESTRATOR_FINALIZE_FAILED"
      );
    }

    return NextResponse.json(
      {
        ok: false,
        operationId:
          operationId || null,
        error:
          error?.message ||
          "ORCHESTRATOR_FINALIZE_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}
