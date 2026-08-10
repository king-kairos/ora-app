export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

import {
  readOperation,
  updateOperation,
} from "@/kairos/orchestrator/engine";

import {
  authorizeKairosExecution,
} from "@/security/kairosExecutionGate";

const LOCAL_BASE =
  "http://127.0.0.1:3000";

async function readJson(
  response: Response
) {
  const text =
    await response.text();

  try {
    return text
      ? JSON.parse(text)
      : {};
  } catch {
    return {
      raw: text,
    };
  }
}

async function postCanonical(
  pathname: string,
  seal: string,
  body: Record<string, unknown>
) {
  const response = await fetch(
    `${LOCAL_BASE}${pathname}`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        "x-kairos-seal":
          seal,
      },
      body:
        JSON.stringify(body),
      cache:
        "no-store",
    }
  );

  return {
    response,
    data:
      await readJson(response),
  };
}

export async function POST(
  req: Request
) {
  let operationId = "";

  try {
    /*
     * KAIROS_ORCHESTRATOR_CANONICAL_RUNTIME_V1
     *
     * FINALIZE sigue siendo dueño de la máquina
     * de estados del Orchestrator.
     *
     * Pero ya NO ejecuta shell directamente.
     *
     * BUILD:
     *   /api/kairos/autoprog/build-validate
     *
     * RESTART FRONT:
     *   /api/ora/system/action
     *
     * Las dos capacidades siguen requiriendo
     * autorización independiente.
     */

    const buildAuthorization =
      authorizeKairosExecution(
        req,
        "modify_runtime"
      );

    if (!buildAuthorization.ok) {
      return NextResponse.json(
        {
          ok: false,
          stage:
            "build_authorization",
          action:
            buildAuthorization.action,
          error:
            buildAuthorization.error,
        },
        {
          status:
            buildAuthorization.status,
        }
      );
    }

    const restartAuthorization =
      authorizeKairosExecution(
        req,
        "restart_front"
      );

    if (!restartAuthorization.ok) {
      return NextResponse.json(
        {
          ok: false,
          stage:
            "restart_authorization",
          action:
            restartAuthorization.action,
          error:
            restartAuthorization.error,
        },
        {
          status:
            restartAuthorization.status,
        }
      );
    }

    const seal = String(
      req.headers.get(
        "x-kairos-seal"
      ) || ""
    ).trim();

    const body =
      await req
        .json()
        .catch(() => ({}));

    operationId = String(
      body?.operationId || ""
    ).trim();

    if (!operationId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "OPERATION_ID_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    const operation =
      await readOperation(
        operationId
      );

    if (!operation) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "OPERATION_NOT_FOUND",
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
      "Delegando build al ejecutor canónico."
    );

    const {
      response:
        buildResponse,
      data:
        build,
    } = await postCanonical(
      "/api/kairos/autoprog/build-validate",
      seal,
      {
        operationId,
        proposalId:
          operation.proposalId,
        source:
          "kairos-orchestrator-finalize",
      }
    );

    const buildPassed =
      buildResponse.ok &&
      build?.ok !== false &&
      build?.buildPassed !== false;

    if (!buildPassed) {
      await updateOperation(
        operationId,
        "recovery-pending",
        "failed",
        "Build canónico falló. Backup preservado; se requiere reparación autorizada."
      );

      return NextResponse.json(
        {
          ok: false,
          mode:
            "KAIROS_ORCHESTRATOR_BUILD_FAILED",
          operationId,
          build,
          canonicalBuild:
            true,
          canonicalBuildEndpoint:
            "/api/kairos/autoprog/build-validate",
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
      "Build canónico validado correctamente."
    );

    await updateOperation(
      operationId,
      "restart_pending",
      "running",
      "Reinicio controlado de ora-front solicitado al System Action canónico."
    );

    const {
      response:
        restartResponse,
      data:
        restart,
    } = await postCanonical(
      "/api/ora/system/action",
      seal,
      {
        action:
          "restart_front",
        source:
          "kairos-orchestrator-finalize",
        operationId,
      }
    );

    const restartScheduled =
      restartResponse.ok &&
      restart?.ok !== false &&
      (
        restart?.scheduled === true ||
        restart?.executionAction ===
          "restart_front"
      );

    if (!restartScheduled) {
      await updateOperation(
        operationId,
        "recovery-pending",
        "failed",
        "Build pasó, pero el reinicio canónico de ora-front no pudo programarse."
      );

      return NextResponse.json(
        {
          ok: false,
          mode:
            "KAIROS_ORCHESTRATOR_RESTART_FAILED",
          operationId,
          build,
          restart,
          canonicalRestart:
            true,
          canonicalRestartEndpoint:
            "/api/ora/system/action",
        },
        {
          status: 409,
        }
      );
    }

    await updateOperation(
      operationId,
      "restarting",
      "running",
      "ora-front fue programado para reinicio por la frontera canónica."
    );

    return NextResponse.json({
      ok: true,
      mode:
        "KAIROS_ORCHESTRATOR_CANONICAL_RUNTIME_V1",
      operationId,
      proposalId:
        operation.proposalId,
      buildPassed:
        true,
      restartScheduled:
        true,
      verifyAfterSeconds:
        8,
      nextEndpoint:
        "/api/kairos/orchestrator/verify",
      canonicalBuild:
        true,
      canonicalBuildEndpoint:
        "/api/kairos/autoprog/build-validate",
      canonicalRestart:
        true,
      canonicalRestartEndpoint:
        "/api/ora/system/action",
      build,
      restart,
      message:
        "Build aprobado por ejecutor canónico. Reinicio programado por System Action; ejecutar verify después de 8 segundos.",
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
