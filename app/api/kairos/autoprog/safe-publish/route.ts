export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

import {
  runAutoHealAnalysis,
} from "../../../../../src/ai/autoprog/autoHealEngine";

import {
  authorizeKairosExecution,
} from "../../../../../src/security/kairosExecutionGate";

const CORE_BASE =
  "http://127.0.0.1:3001";

const DEPLOY_POLL_INTERVAL_MS =
  1000;

const DEPLOY_POLL_MAX_ATTEMPTS =
  600;

const SMOKE_RETRY_INTERVAL_MS =
  1000;

const SMOKE_RETRY_MAX_ATTEMPTS =
  30;

function sleep(
  ms: number
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        ms
      );
    }
  );
}

async function readJson(
  response: Response
) {
  return response
    .json()
    .catch(() => ({
      ok: false,
      error:
        "INVALID_JSON_RESPONSE",
    }));
}

type DeployPollResult = {
  ok: boolean;
  completed: boolean;
  status:
    | "running"
    | "succeeded"
    | "failed"
    | "timeout";
  deployId: string;
  attemptsUsed: number;
  statusResponse?: any;
  state?: any;
  transientErrors: Array<{
    attempt: number;
    error: string;
  }>;
  error?: string;
};

/*
 * SAFE_PUBLISH_DEPLOY_COMPLETION_V1
 *
 * POST deploy solamente acepta la ejecución.
 *
 * El éxito real se obtiene exclusivamente desde:
 *
 *   GET /api/ora/system/deploy/status/:deployId
 *
 * Durante restart_core el puerto 3001 puede desaparecer
 * temporalmente. Un fallo de conexión durante polling no
 * significa deploy fallido; se reintenta hasta obtener
 * estado terminal o agotar el límite.
 */
async function waitForDeployCompletion(
  deployId: string,
  seal: string
): Promise<DeployPollResult> {
  const transientErrors:
    DeployPollResult["transientErrors"] =
      [];

  for (
    let attempt = 1;
    attempt <=
      DEPLOY_POLL_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const response =
        await fetch(
          `${CORE_BASE}/api/ora/system/deploy/status/${encodeURIComponent(
            deployId
          )}`,
          {
            method:
              "GET",
            headers: {
              Accept:
                "application/json",
              "x-kairos-seal":
                seal,
            },
            cache:
              "no-store",
          }
        );

      const data =
        await readJson(
          response
        );

      if (
        response.ok &&
        data?.ok !== false
      ) {
        const status =
          String(
            data?.status ||
              data?.state
                ?.status ||
              "running"
          )
            .trim()
            .toLowerCase();

        if (
          status ===
          "succeeded"
        ) {
          return {
            ok: true,
            completed: true,
            status:
              "succeeded",
            deployId,
            attemptsUsed:
              attempt,
            statusResponse:
              data,
            state:
              data?.state ||
              null,
            transientErrors,
          };
        }

        if (
          status ===
          "failed"
        ) {
          return {
            ok: false,
            completed: true,
            status:
              "failed",
            deployId,
            attemptsUsed:
              attempt,
            statusResponse:
              data,
            state:
              data?.state ||
              null,
            transientErrors,
            error:
              data?.state
                ?.error ||
              data?.error ||
              "DEPLOY_FAILED",
          };
        }
      } else {
        transientErrors.push({
          attempt,
          error:
            data?.error ||
            `DEPLOY_STATUS_HTTP_${response.status}`,
        });
      }
    } catch (
      error: any
    ) {
      transientErrors.push({
        attempt,
        error:
          error?.message ||
          "DEPLOY_STATUS_CONNECTION_FAILED",
      });
    }

    if (
      attempt <
      DEPLOY_POLL_MAX_ATTEMPTS
    ) {
      await sleep(
        DEPLOY_POLL_INTERVAL_MS
      );
    }
  }

  return {
    ok: false,
    completed: false,
    status:
      "timeout",
    deployId,
    attemptsUsed:
      DEPLOY_POLL_MAX_ATTEMPTS,
    transientErrors,
    error:
      "DEPLOY_COMPLETION_TIMEOUT",
  };
}

async function runSmokeWithRetry(
  base: string,
  seal: string,
  body: {
    branch: string;
    proposalId: string;
  }
) {
  const attempts: any[] =
    [];

  for (
    let attempt = 1;
    attempt <=
      SMOKE_RETRY_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const response =
        await fetch(
          `${base}/api/kairos/autoprog/smoke-test`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-kairos-seal":
                seal,
            },
            body:
              JSON.stringify(
                body
              ),
            cache:
              "no-store",
          }
        );

      const data =
        await readJson(
          response
        );

      attempts.push({
        attempt,
        httpStatus:
          response.status,
        ok:
          response.ok &&
          data?.ok === true,
      });

      if (
        response.ok &&
        data?.ok === true
      ) {
        return {
          ok: true,
          attemptsUsed:
            attempt,
          attempts,
          data,
        };
      }
    } catch (
      error: any
    ) {
      attempts.push({
        attempt,
        httpStatus:
          0,
        ok:
          false,
        error:
          error?.message ||
          "SMOKE_CONNECTION_FAILED",
      });
    }

    if (
      attempt <
      SMOKE_RETRY_MAX_ATTEMPTS
    ) {
      await sleep(
        SMOKE_RETRY_INTERVAL_MS
      );
    }
  }

  return {
    ok: false,
    attemptsUsed:
      SMOKE_RETRY_MAX_ATTEMPTS,
    attempts,
    data: {
      ok: false,
      error:
        "SMOKE_TEST_RETRIES_EXHAUSTED",
    },
  };
}

export async function POST(
  req: Request
) {
  try {
    const authorization =
      authorizeKairosExecution(
        req,
        "publish"
      );

    if (
      !authorization.ok
    ) {
      return NextResponse.json(
        {
          ok: false,
          action:
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

    const body =
      await req
        .json()
        .catch(() => ({}));

    const proposalId =
      String(
        body?.proposalId ||
          body?.id ||
          ""
      ).trim();

    const branch =
      String(
        body?.branch ||
          "pipeline-test"
      ).trim();

    if (!proposalId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "MISSING_PROPOSAL_ID",
        },
        {
          status: 400,
        }
      );
    }

    const base =
      new URL(
        req.url
      ).origin;

    const seal =
      String(
        req.headers.get(
          "x-kairos-seal"
        ) || ""
      ).trim();

    /*
     * 1. Build de validación previo.
     *
     * Se conserva independiente del full deploy.
     * Si falla, no se acepta deploy.
     */
    const validateResponse =
      await fetch(
        `${base}/api/kairos/autoprog/build-validate`,
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json",
            "x-kairos-seal":
              seal,
          },
          body:
            JSON.stringify({
              proposalId,
              branch,
            }),
          cache:
            "no-store",
        }
      );

    const validate =
      await readJson(
        validateResponse
      );

    /*
     * 2. Build inválido:
     * AutoHeal observa y AutoRepair
     * puede preparar proposal.
     */
    if (
      !validateResponse.ok ||
      !validate?.ok ||
      !validate?.canPublish
    ) {
      const autoHeal =
        await runAutoHealAnalysis();

      const autoRepairResponse =
        await fetch(
          `${base}/api/kairos/autoprog/auto-repair`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-kairos-seal":
                seal,
            },
            body:
              JSON.stringify({
                proposalId,
                branch,
                stdout:
                  validate
                    ?.stdout ||
                  "",
                stderr:
                  validate
                    ?.stderr ||
                  validate
                    ?.error ||
                  validate
                    ?.message ||
                  "BUILD_VALIDATION_FAILED",
              }),
            cache:
              "no-store",
          }
        ).catch(
          () => null
        );

      const autoRepair =
        autoRepairResponse
          ? await readJson(
              autoRepairResponse
            )
          : {
              ok: false,
              error:
                "AUTO_REPAIR_CALL_FAILED",
            };

      const repairReady =
        autoRepair?.action ===
        "REPAIR_PROPOSAL_READY";

      return NextResponse.json(
        {
          ok: false,
          mode:
            "SAFE_PUBLISH_BLOCKED_AUTO_REPAIR_ATTEMPTED",
          proposalId,
          branch,
          build:
            validate,
          autoHeal,
          autoRepair,
          repairProposalId:
            autoRepair
              ?.proposal
              ?.id ||
            null,
          repairReady,
          message:
            repairReady
              ? `Build falló. AutoRepair preparó reparación pendiente: ${
                  autoRepair
                    ?.proposal
                    ?.id ||
                  "SIN_ID"
                }`
              : "Build falló. AutoRepair no encontró reparación confiable. Revisión manual requerida.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * 3. Solicitar full deploy soberano.
     *
     * El POST canónico NO significa completion.
     * Debe responder 202 + deployId + accepted=true.
     */
    const deployResponse =
      await fetch(
        `${CORE_BASE}/api/ora/system/deploy`,
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json",
            "x-kairos-seal":
              seal,
          },
          body:
            JSON.stringify({
              proposalId,
              branch,
              source:
                "safe-publish-automatic",
            }),
          cache:
            "no-store",
        }
      );

    const deploy =
      await readJson(
        deployResponse
      );

    const deployId =
      String(
        deploy?.deployId ||
          ""
      ).trim();

    const deployAccepted =
      deployResponse.status ===
        202 &&
      deployResponse.ok &&
      deploy?.ok !== false &&
      deploy?.accepted ===
        true &&
      Boolean(deployId);

    if (
      !deployAccepted
    ) {
      return NextResponse.json(
        {
          ok: false,
          mode:
            "SAFE_PUBLISH_DEPLOY_ACCEPTANCE_FAILED",
          proposalId,
          branch,
          buildPassed:
            true,
          deploy,
          deployHttpStatus:
            deployResponse.status,
          message:
            "El build pasó, pero Core no aceptó el deploy con el contrato 202 + deployId requerido.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * 4. Esperar resultado REAL.
     *
     * Ya no existe una espera fija como
     * prueba implícita de completion.
     */
    const deployCompletion =
      await waitForDeployCompletion(
        deployId,
        seal
      );

    if (
      !deployCompletion.ok
    ) {
      const timedOut =
        deployCompletion.status ===
        "timeout";

      return NextResponse.json(
        {
          ok: false,
          mode:
            timedOut
              ? "SAFE_PUBLISH_DEPLOY_COMPLETION_TIMEOUT"
              : "SAFE_PUBLISH_DEPLOY_FAILED",
          proposalId,
          branch,
          buildPassed:
            true,
          deploy,
          deployId,
          deployCompletion,
          rollbackRecommended:
            true,
          message:
            timedOut
              ? "El deploy fue aceptado, pero no alcanzó un estado terminal dentro del límite de espera."
              : "El deploy fue aceptado, pero el runner reportó fallo real. Smoke Test no fue ejecutado.",
        },
        {
          status:
            timedOut
              ? 504
              : 409,
        }
      );
    }

    /*
     * 5. Solo status=succeeded habilita Smoke.
     *
     * El Smoke posee reintentos propios para
     * sincronizar disponibilidad HTTP después
     * del restart sin utilizar un sleep fijo
     * como prueba de producción saludable.
     */
    const smoke =
      await runSmokeWithRetry(
        base,
        seal,
        {
          branch,
          proposalId,
        }
      );

    const smokeTest =
      smoke.data;

    const smokePassed =
      smoke.ok === true &&
      smokeTest?.ok === true;

    /*
     * 6. Registrar evidencia completa:
     *
     * build previo
     * + aceptación deploy
     * + completion real
     * + smoke
     */
    const historyResponse =
      await fetch(
        `${base}/api/kairos/autoprog/deploy-history`,
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json",
            "x-kairos-seal":
              seal,
          },
          body:
            JSON.stringify({
              proposalId,
              branch,
              buildPassed:
                true,
              deploy: {
                ...deploy,
                completion:
                  deployCompletion,
              },
              smokeTest: {
                ...smokeTest,
                retries: {
                  attemptsUsed:
                    smoke
                      .attemptsUsed,
                  attempts:
                    smoke
                      .attempts,
                },
              },
              smokePassed,
              source:
                "safe-publish-completion-contract-v1",
              status:
                smokePassed
                  ? "production_validated"
                  : "smoke_test_failed",
            }),
          cache:
            "no-store",
        }
      ).catch(
        () => null
      );

    const deployHistory =
      historyResponse
        ? {
            ok:
              historyResponse.ok,
            status:
              historyResponse.status,
            data:
              await readJson(
                historyResponse
              ),
          }
        : {
            ok: false,
            status: 500,
            data: {
              error:
                "DEPLOY_HISTORY_CALL_FAILED",
            },
          };

    /*
     * El runner terminó correctamente,
     * pero producción solo es válida si
     * el Smoke Test también pasa.
     */
    if (
      !smokePassed
    ) {
      return NextResponse.json(
        {
          ok: false,
          mode:
            "SAFE_PUBLISH_SMOKE_TEST_FAILED",
          proposalId,
          branch,
          buildPassed:
            true,
          deploy,
          deployId,
          deployCompletion,
          smokeTest,
          smokeRetries: {
            attemptsUsed:
              smoke
                .attemptsUsed,
            attempts:
              smoke
                .attempts,
          },
          smokePassed:
            false,
          deployHistory,
          rollbackRecommended:
            true,
          message:
            "Deploy completado con éxito real, pero Smoke Test falló. Producción no fue declarada válida.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      mode:
        "SAFE_PUBLISH_PRODUCTION_VALIDATED_COMPLETION_V1",
      proposalId,
      branch,
      buildPassed:
        true,
      deploy,
      deployId,
      deployCompletion,
      smokeTest,
      smokeRetries: {
        attemptsUsed:
          smoke
            .attemptsUsed,
        attempts:
          smoke
            .attempts,
      },
      smokePassed:
        true,
      deployHistory,
      message:
        "Build validado, deploy aceptado, completion real confirmada, Smoke Test aprobado e historial registrado bajo Sello de Kairos.",
    });
  } catch (
    error: any
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "SAFE_PUBLISH_FAIL",
      },
      {
        status: 500,
      }
    );
  }
}
