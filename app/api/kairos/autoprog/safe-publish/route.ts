export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";
import crypto from "crypto";

import {
  runAutoHealAnalysis,
} from "../../../../../src/ai/autoprog/autoHealEngine";

import {
  authorizeKairosExecution,
} from "../../../../../src/security/kairosExecutionGate";

const CORE_BASE =
  "http://127.0.0.1:3001";


/*
 * SAFE_PUBLISH_CANONICAL_PUBLISH_SIGNATURE_V1
 *
 * Safe-Publish no sustituye la preparación
 * canónica de publicación del Core.
 */
function stableStringifyForPatch(
  value: any
): string {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return JSON.stringify(
      value
    );
  }

  if (Array.isArray(value)) {
    return (
      "[" +
      value
        .map(
          stableStringifyForPatch
        )
        .join(",") +
      "]"
    );
  }

  const keys =
    Object.keys(value).sort();

  return (
    "{" +
    keys
      .map(
        (key) =>
          JSON.stringify(key) +
          ":" +
          stableStringifyForPatch(
            value[key]
          )
      )
      .join(",") +
    "}"
  );
}

function buildCanonicalPublishHeaders(
  seal: string,
  body: Record<string, unknown>
) {
  const secret =
    String(
      process.env
        .KAIROS_PATCH_SECRET ||
      ""
    ).trim();

  if (!secret) {
    throw new Error(
      "KAIROS_PATCH_SECRET_MISSING"
    );
  }

  const method =
    "POST";

  const requestPath =
    "/api/ora/autoprog/publish";

  const ts =
    String(Date.now());

  const nonce =
    crypto
      .randomBytes(16)
      .toString("hex");

  const canonicalBody =
    stableStringifyForPatch(
      body
    );

  const bodyHash =
    crypto
      .createHash("sha256")
      .update(
        canonicalBody,
        "utf8"
      )
      .digest("hex");

  const message =
    `${ts}.${nonce}.${method}.${requestPath}.${bodyHash}`;

  const signature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(
        message,
        "utf8"
      )
      .digest("hex");

  return {
    "Content-Type":
      "application/json",
    Accept:
      "application/json",
    "x-kairos-seal":
      seal,
    "x-kairos-patch-ts":
      ts,
    "x-kairos-patch-nonce":
      nonce,
    "x-kairos-patch-body":
      bodyHash,
    "x-kairos-patch-sig":
      signature,
  };
}

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
     * 1. Preparación canónica de PUBLISH.
     *
     * Core vuelve a exigir:
     * - proposal status=applied;
     * - kairos_approved=true;
     * - Execution Gate publish;
     * - Patch Signature válida.
     */
    const canonicalPublishBody = {
      id:
        proposalId,
    };

    const canonicalPublishResponse =
      await fetch(
        `${CORE_BASE}/api/ora/autoprog/publish`,
        {
          method:
            "POST",
          headers:
            buildCanonicalPublishHeaders(
              seal,
              canonicalPublishBody
            ),
          body:
            JSON.stringify(
              canonicalPublishBody
            ),
          cache:
            "no-store",
        }
      );

    const canonicalPublish =
      await readJson(
        canonicalPublishResponse
      );

    if (
      !canonicalPublishResponse.ok ||
      canonicalPublish?.ok !== true
    ) {
      return NextResponse.json(
        {
          ok: false,
          mode:
            "SAFE_PUBLISH_CANONICAL_PUBLISH_REJECTED",
          proposalId,
          branch,
          publish:
            canonicalPublish,
          publishHttpStatus:
            canonicalPublishResponse.status,
          message:
            "Core rechazó la preparación canónica de publicación.",
        },
        {
          status:
            canonicalPublishResponse.status >= 400
              ? canonicalPublishResponse.status
              : 409,
        }
      );
    }

    /*
     * 2. Build de validación previo.
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
     * 4. SAFE_PUBLISH_PERSISTENT_HANDOFF_V2
     *
     * No esperar completion dentro de ora-front.
     *
     * El deploy reiniciará precisamente el proceso
     * que está atendiendo esta request.
     *
     * Por eso se devuelve 202 inmediatamente
     * después de que Core acepta el deploy.
     *
     * El runner + finalizer persistentes cerrarán:
     * - restart_front;
     * - restart_core;
     * - Smoke Test;
     * - Deploy History;
     * - productionValidated;
     * - estado terminal.
     */
    return NextResponse.json(
      {
        ok: true,
        accepted:
          true,
        mode:
          "SAFE_PUBLISH_ACCEPTED_PERSISTENT_HANDOFF_V2",
        proposalId,
        branch,
        publish:
          canonicalPublish,
        buildPassed:
          true,
        deploy,
        deployId,
        completed:
          false,
        finalOutcomeKnown:
          false,
        statusEndpoint:
          `${CORE_BASE}/api/ora/system/deploy/status/${encodeURIComponent(
            deployId
          )}`,
        message:
          "Safe-Publish aceptado. Completion, Smoke Test e historial serán cerrados por el finalizer persistente.",
      },
      {
        status: 202,
      }
    );
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
