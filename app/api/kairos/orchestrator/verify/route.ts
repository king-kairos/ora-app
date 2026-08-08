export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

import {
  readOperation,
  updateOperation,
} from "@/kairos/orchestrator/engine";

import {
  getProposal,
} from "@/ai/autoprog/patchStore";

import {
  completeStrategicPlanAfterVerification,
} from "@/kairos/strategic-planner/proposal-engine";

const run = promisify(exec);

function validSeal(req: Request) {
  const expected = String(
    process.env.KAIROS_SEAL || ""
  ).trim();

  if (!expected) return false;

  return String(
    req.headers.get("x-kairos-seal") || ""
  ).trim() === expected;
}

type SmokeTarget = {
  kind: "page" | "api" | "fallback";
  path: string;
};

function proposalFiles(proposal: any) {
  if (Array.isArray(proposal?.targetFiles)) {
    return proposal.targetFiles
      .map((item: any) =>
        String(item || "").trim()
      )
      .filter(Boolean);
  }

  if (Array.isArray(proposal?.files)) {
    return proposal.files
      .map((item: any) =>
        String(item?.path || "").trim()
      )
      .filter(Boolean);
  }

  return [];
}

function deriveSmokeTargets(
  proposal: any
): SmokeTarget[] {
  const files = proposalFiles(proposal);
  const targets: SmokeTarget[] = [];

  for (const file of files) {
    if (
      /^app\/.+\/page\.tsx?$/.test(file)
    ) {
      const path =
        "/" +
        file
          .replace(/^app\//, "")
          .replace(/\/page\.tsx?$/, "");

      targets.push({
        kind: "page",
        path,
      });

      continue;
    }

    if (
      /^app\/api\/.+\/route\.tsx?$/.test(
        file
      )
    ) {
      const path =
        "/" +
        file
          .replace(/^app\//, "")
          .replace(/\/route\.tsx?$/, "");

      targets.push({
        kind: "api",
        path,
      });
    }
  }

  const unique = Array.from(
    new Map(
      targets.map((target) => [
        `${target.kind}:${target.path}`,
        target,
      ])
    ).values()
  );

  if (unique.length > 0) {
    return unique;
  }

  return [
    {
      kind: "fallback",
      path: "/",
    },
  ];
}

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function checkHttpOnce(
  pathname: string
) {
  const url =
    `http://127.0.0.1:3000${pathname}`;

  try {
    const { stdout } = await run(
      `curl -s -o /dev/null -w "%{http_code}" "${url}"`,
      {
        timeout: 20000,
      }
    );

    const status = Number(
      String(stdout).trim()
    );

    return {
      ok:
        status >= 200 &&
        status < 400,
      url,
      status,
    };
  } catch (error: any) {
    return {
      ok: false,
      url,
      status: 0,
      error:
        error?.message ||
        "HTTP_CHECK_FAILED",
    };
  }
}

async function checkHttpWithRetry(
  pathname: string,
  attempts = 30,
  delayMs = 1000
) {
  const history: Array<{
    attempt: number;
    status: number;
  }> = [];

  let last =
    await checkHttpOnce(pathname);

  history.push({
    attempt: 1,
    status: last.status,
  });

  if (last.ok) {
    return {
      ...last,
      attemptsUsed: 1,
      history,
    };
  }

  for (
    let attempt = 2;
    attempt <= attempts;
    attempt += 1
  ) {
    await sleep(delayMs);

    last =
      await checkHttpOnce(pathname);

    history.push({
      attempt,
      status: last.status,
    });

    if (last.ok) {
      return {
        ...last,
        attemptsUsed: attempt,
        history,
      };
    }
  }

  return {
    ...last,
    attemptsUsed: attempts,
    history,
  };
}

async function checkPm2() {
  try {
    const { stdout } = await run(
      "pm2 jlist",
      {
        timeout: 15000,
      }
    );

    const processes = JSON.parse(stdout);

    const required = [
      "ora",
      "ora-front",
      "ora-autorepair-worker",
    ];

    const services = required.map(
      (name) => {
        const process = processes.find(
          (item: any) =>
            item?.name === name
        );

        const status =
          process?.pm2_env?.status ||
          "missing";

        return {
          name,
          status,
          ok: status === "online",
        };
      }
    );

    return {
      ok: services.every(
        (item) => item.ok
      ),
      services,
    };
  } catch (error: any) {
    return {
      ok: false,
      error:
        error?.message ||
        "PM2_CHECK_FAILED",
      services: [],
    };
  }
}

async function postJson(
  url: string,
  seal: string,
  body: any
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":
        "application/json",
      "x-kairos-seal": seal,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();

  let data: any = {};

  try {
    data = text
      ? JSON.parse(text)
      : {};
  } catch {
    data = {
      raw: text,
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
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

    const proposal = await getProposal(
      operation.proposalId
    );

    const requestedPath = String(
      body?.pagePath ||
        body?.targetPath ||
        ""
    ).trim();

    const smokeTargets = requestedPath
      ? [
          {
            kind: requestedPath.startsWith(
              "/api/"
            )
              ? ("api" as const)
              : ("page" as const),
            path: requestedPath.startsWith("/")
              ? requestedPath
              : `/${requestedPath}`,
          },
        ]
      : deriveSmokeTargets(proposal);

    await updateOperation(
      operationId,
      "smoke_testing",
      "running",
      `Ejecutando smoke test sobre: ${smokeTargets
        .map((target) => target.path)
        .join(", ")}.`
    );

    const routeChecks = [];

    for (const target of smokeTargets) {
      const result =
        await checkHttpWithRetry(
          target.path,
          30,
          1000
        );

      routeChecks.push({
        ...target,
        ...result,
      });
    }

    const page =
      routeChecks.find(
        (item) => item.kind === "page"
      ) ||
      routeChecks.find(
        (item) =>
          item.kind === "fallback"
      ) ||
      routeChecks[0];

    const apiRoutes =
      routeChecks.filter(
        (item) => item.kind === "api"
      );

    const pageRoutes =
      routeChecks.filter(
        (item) =>
          item.kind === "page" ||
          item.kind === "fallback"
      );

    const routesHealthy =
      routeChecks.length > 0 &&
      routeChecks.every(
        (item) => item.ok
      );

    const pm2 = await checkPm2();

    const smokePassed =
      routesHealthy && pm2.ok;

    if (!smokePassed) {
      await updateOperation(
        operationId,
        "recovery-pending",
        "failed",
        "Smoke Test falló. Producción no fue declarada saludable."
      );

      return NextResponse.json(
        {
          ok: false,
          mode:
            "KAIROS_ORCHESTRATOR_SMOKE_FAILED",
          operationId,
          page,
          routeChecks,
          smokeTargets,
          pm2,
          next:
            "RECOVERY_REQUIRES_NEW_KAIROS_SEAL",
        },
        {
          status: 409,
        }
      );
    }

    await updateOperation(
      operationId,
      "smoke_passed",
      "running",
      "Rutas objetivo y servicios PM2 respondieron correctamente."
    );

    await updateOperation(
      operationId,
      "health_checking",
      "running",
      "Evaluando Health Gate."
    );

    const health = {
      ok: true,
      buildPassed: true,
      routesHealthy,
      pageHealthy:
        pageRoutes.length === 0 ||
        pageRoutes.every(
          (item) => item.ok
        ),
      apiHealthy:
        apiRoutes.length === 0 ||
        apiRoutes.every(
          (item) => item.ok
        ),
      servicesHealthy: pm2.ok,
      score: 100,
    };

    await updateOperation(
      operationId,
      "health_passed",
      "running",
      `Health Gate aprobado con score ${health.score}.`
    );

    await updateOperation(
      operationId,
      "deploy_history",
      "running",
      "Registrando ejecución en Deploy History."
    );

    const seal = String(
      req.headers.get(
        "x-kairos-seal"
      ) || ""
    ).trim();

    const history = await postJson(
      "http://127.0.0.1:3000/api/kairos/autoprog/deploy-history",
      seal,
      {
        proposalId:
          operation.proposalId,
        branch:
          String(
            proposal?.metadata?.branch ||
              ""
          ).trim() ||
          null,
        buildPassed: true,
        deploy: {
          restarted: true,
          process: "ora-front",
        },
        smokeTest: {
          passed: true,
          page,
          routes: routeChecks,
          pm2,
        },
        source:
          "kairos-orchestrator-update-158",
      }
    );

    if (
      !history.ok ||
      history.data?.ok === false
    ) {
      await updateOperation(
        operationId,
        "recovery-pending",
        "failed",
        "Sistema saludable, pero Deploy History no pudo registrarse."
      );

      return NextResponse.json(
        {
          ok: false,
          operationId,
          error:
            history.data?.error ||
            "DEPLOY_HISTORY_FAILED",
          history,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * UPDATE 170.5
     * Si la propuesta pertenece a un Strategic Plan,
     * la verificación saludable cierra automáticamente
     * la tarea de verificación y el plan completo.
     */
    const strategicPlanId = String(
      proposal?.metadata?.planId || ""
    ).trim();

    let strategicPlan: any = null;

    if (strategicPlanId) {
      strategicPlan =
        await completeStrategicPlanAfterVerification({
          planId: strategicPlanId,
          operationId,
          message:
            "Plan estratégico cerrado automáticamente desde Orchestrator Verify.",
          checks: {
            typescript: true,
            build: true,
            pm2: pm2.ok,
            publicRoute:
              pageRoutes.length === 0 ||
              pageRoutes.every(
                (item) => item.ok
              ),
            apiRoute:
              apiRoutes.length === 0 ||
              apiRoutes.every(
                (item) => item.ok
              ),
          },
        });
    }

    const completed =
      await updateOperation(
        operationId,
        "completed",
        "completed",
        strategicPlanId
          ? "Pipeline completado y plan estratégico cerrado automáticamente."
          : "Pipeline completado: build, restart, smoke test, health gate e historial."
      );

    return NextResponse.json({
      ok: true,
      mode:
        "KAIROS_ORCHESTRATOR_UPDATE_172_COMPLETE",
      operationId,
      proposalId:
        operation.proposalId,
      pagePath:
        page?.path || "/",
      smokeTargets,
      routeChecks,
      buildPassed: true,
      restartPassed: true,
      smokePassed: true,
      health,
      page,
      pm2,
      deployHistory:
        history.data,
      strategicPlan,
      operation: completed,
      message:
        "UPDATE 172 completado correctamente con rutas reales y reintentos sincronizados.",
    });
  } catch (error: any) {
    if (operationId) {
      await updateOperation(
        operationId,
        "recovery-pending",
        "failed",
        error?.message ||
          "ORCHESTRATOR_VERIFY_FAILED"
      );
    }

    return NextResponse.json(
      {
        ok: false,
        operationId:
          operationId || null,
        error:
          error?.message ||
          "ORCHESTRATOR_VERIFY_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}
