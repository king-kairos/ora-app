export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { runAutoHealAnalysis } from "../../../../../src/ai/autoprog/autoHealEngine";

function hasValidSeal(req: Request) {
  const expected = String(
    process.env.KAIROS_SEAL || ""
  ).trim();

  if (!expected) return true;

  const received = String(
    req.headers.get("x-kairos-seal") || ""
  ).trim();

  return received === expected;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readJson(response: Response) {
  return response.json().catch(() => ({
    ok: false,
    error: "INVALID_JSON_RESPONSE",
  }));
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

    const body = await req
      .json()
      .catch(() => ({}));

    const proposalId = String(
      body?.proposalId ||
      body?.id ||
      ""
    ).trim();

    const branch = String(
      body?.branch ||
      "pipeline-test"
    ).trim();

    if (!proposalId) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_PROPOSAL_ID",
        },
        {
          status: 400,
        }
      );
    }

    const base = new URL(req.url).origin;

    const seal = String(
      req.headers.get("x-kairos-seal") || ""
    ).trim();

    /*
      1. Validar build antes de publicar.
    */
    const validateResponse = await fetch(
      `${base}/api/kairos/autoprog/build-validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kairos-seal": seal,
        },
        body: JSON.stringify({
          proposalId,
          branch,
        }),
        cache: "no-store",
      }
    );

    const validate = await readJson(
      validateResponse
    );

    /*
      2. Si el build falla, bloquear publicación
      y entregar el error real a AutoHeal/AutoRepair.
    */
    if (
      !validateResponse.ok ||
      !validate?.ok ||
      !validate?.canPublish
    ) {
      const autoHeal =
        await runAutoHealAnalysis();

      const autoRepairResponse = await fetch(
        `${base}/api/kairos/autoprog/auto-repair`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-kairos-seal": seal,
          },
          body: JSON.stringify({
            proposalId,
            branch,
            stdout:
              validate?.stdout || "",
            stderr:
              validate?.stderr ||
              validate?.error ||
              validate?.message ||
              "BUILD_VALIDATION_FAILED",
          }),
          cache: "no-store",
        }
      ).catch(() => null);

      const autoRepair = autoRepairResponse
        ? await readJson(autoRepairResponse)
        : {
            ok: false,
            error: "AUTO_REPAIR_CALL_FAILED",
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
          build: validate,
          autoHeal,
          autoRepair,
          repairProposalId:
            autoRepair?.proposal?.id ||
            null,
          repairReady,
          message: repairReady
            ? `Build falló. AutoRepair preparó reparación pendiente: ${
                autoRepair?.proposal?.id ||
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
      3. Build aprobado: iniciar deploy soberano.
    */
    const deployResponse = await fetch(
      "http://127.0.0.1:3001/api/ora/system/deploy",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kairos-seal": seal,
        },
        body: JSON.stringify({
          proposalId,
          branch,
          source: "safe-publish-automatic",
        }),
        cache: "no-store",
      }
    );

    const deploy = await readJson(
      deployResponse
    );

    if (
      !deployResponse.ok ||
      deploy?.ok === false
    ) {
      return NextResponse.json(
        {
          ok: false,
          mode: "SAFE_PUBLISH_DEPLOY_FAILED",
          proposalId,
          branch,
          buildPassed: true,
          deploy,
          message:
            "El build pasó, pero el deploy soberano no pudo iniciarse.",
        },
        {
          status: 502,
        }
      );
    }

    /*
      4. Dar tiempo al frontend para reiniciar.
      El puerto 3000 puede tardar unos segundos.
    */
    await sleep(5000);

    /*
      5. Smoke Test automático después del deploy.
    */
    const smokeResponse = await fetch(
      `${base}/api/kairos/autoprog/smoke-test`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kairos-seal": seal,
        },
        body: JSON.stringify({
          branch,
          proposalId,
        }),
        cache: "no-store",
      }
    ).catch(() => null);

    const smokeTest = smokeResponse
      ? await readJson(smokeResponse)
      : {
          ok: false,
          error:
            "SMOKE_TEST_CONNECTION_FAILED",
        };

    const smokePassed =
      Boolean(smokeResponse?.ok) &&
      smokeTest?.ok === true;

    /*
      6. Registrar una sola evidencia completa:
      build + deploy + smoke test.
    */
    const historyResponse = await fetch(
      `${base}/api/kairos/autoprog/deploy-history`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kairos-seal": seal,
        },
        body: JSON.stringify({
          proposalId,
          branch,
          buildPassed: true,
          deploy,
          smokeTest,
          smokePassed,
          source:
            "safe-publish-automatic",
          status: smokePassed
            ? "production_validated"
            : "smoke_test_failed",
        }),
        cache: "no-store",
      }
    ).catch(() => null);

    const deployHistory = historyResponse
      ? {
          ok: historyResponse.ok,
          status: historyResponse.status,
          data: await readJson(
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
      El deploy puede haber sido iniciado correctamente,
      pero producción no se declara validada si falla
      el Smoke Test.
    */
    if (!smokePassed) {
      return NextResponse.json(
        {
          ok: false,
          mode:
            "SAFE_PUBLISH_SMOKE_TEST_FAILED",
          proposalId,
          branch,
          buildPassed: true,
          deploy,
          smokeTest,
          smokePassed: false,
          deployHistory,
          rollbackRecommended: true,
          message:
            "Build aprobado y deploy iniciado, pero el Smoke Test falló. Producción no fue declarada válida.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      mode:
        "SAFE_PUBLISH_PRODUCTION_VALIDATED",
      proposalId,
      branch,
      buildPassed: true,
      deploy,
      smokeTest,
      smokePassed: true,
      deployHistory,
      message:
        "Build validado, deploy iniciado, Smoke Test aprobado e historial automático registrado bajo Sello de Kairos.",
    });
  } catch (error: any) {
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
