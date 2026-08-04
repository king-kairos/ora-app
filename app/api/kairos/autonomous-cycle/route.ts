export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

import { NextResponse } from "next/server";

import {
  getProposal,
} from "@/ai/autoprog/patchStore";

const LOCAL_BASE_URL =
  "http://127.0.0.1:3000";

function clean(value: unknown) {
  return String(value || "").trim();
}

function validSeal(req: Request) {
  const expected = clean(
    process.env.KAIROS_SEAL
  );

  const received = clean(
    req.headers.get("x-kairos-seal") ||
      req.headers.get("kairos-seal")
  );

  return Boolean(
    expected &&
      received &&
      received === expected
  );
}

async function readJson(
  response: Response
) {
  const text = await response.text();

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

async function postJson(
  pathname: string,
  seal: string,
  body: Record<string, unknown>
) {
  const response = await fetch(
    `${LOCAL_BASE_URL}${pathname}`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        "x-kairos-seal": seal,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );

  return {
    ok: response.ok,
    status: response.status,
    data: await readJson(response),
  };
}

async function getJson(
  pathname: string,
  seal: string
) {
  const response = await fetch(
    `${LOCAL_BASE_URL}${pathname}`,
    {
      method: "GET",
      headers: {
        "x-kairos-seal": seal,
      },
      cache: "no-store",
    }
  );

  return {
    ok: response.ok,
    status: response.status,
    data: await readJson(response),
  };
}

function nextProposalFrom(
  executeResult: any
) {
  const created = Array.isArray(
    executeResult?.strategicCycle?.created
  )
    ? executeResult.strategicCycle.created
    : [];

  const first = created.find(
    (item: any) =>
      clean(item?.proposalId)
  );

  return first
    ? {
        proposalId:
          clean(first.proposalId),
        taskId:
          clean(first.taskId) || null,
        duplicate:
          first.duplicate === true,
      }
    : null;
}

async function createCycle(
  seal: string,
  body: any
) {
  const intent = clean(body?.intent);

  const branch =
    clean(body?.branch) || undefined;

  const targetFiles =
    Array.isArray(body?.targetFiles)
      ? body.targetFiles
          .map(clean)
          .filter(Boolean)
      : undefined;

  const preferredEssence =
    clean(body?.preferredEssence) ||
    undefined;

  if (!intent) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "INTENT_REQUIRED",
        },
        {
          status: 400,
        }
      ),
    };
  }

  const createdPlan = await postJson(
    "/api/kairos/strategic-planner/create",
    seal,
    {
      intent,
      branch,
      targetFiles,
      preferredEssence,
    }
  );

  if (
    !createdPlan.ok ||
    createdPlan.data?.ok === false
  ) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          phase: "create-plan",
          error:
            createdPlan.data?.error ||
            "PLAN_CREATE_FAILED",
          upstream: createdPlan,
        },
        {
          status:
            createdPlan.status || 409,
        }
      ),
    };
  }

  const plan =
    createdPlan.data?.plan;

  const planId = clean(
    plan?.planId
  );

  if (!planId) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error:
            "PLAN_ID_MISSING_AFTER_CREATE",
          createdPlan:
            createdPlan.data,
        },
        {
          status: 409,
        }
      ),
    };
  }

  const proposals = await postJson(
    "/api/kairos/strategic-planner/create-proposals",
    seal,
    {
      planId,
    }
  );

  if (
    !proposals.ok ||
    proposals.data?.ok === false
  ) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          phase:
            "create-first-proposal",
          planId,
          error:
            proposals.data?.error ||
            "PROPOSAL_CREATE_FAILED",
          upstream: proposals,
        },
        {
          status:
            proposals.status || 409,
        }
      ),
    };
  }

  const created = Array.isArray(
    proposals.data?.created
  )
    ? proposals.data.created
    : [];

  const firstProposal =
    created.find(
      (item: any) =>
        clean(item?.proposalId)
    ) || null;

  return {
    response: NextResponse.json({
      ok: true,
      mode:
        "KAIROS_AUTONOMOUS_CYCLE_V1",
      action: "create",
      phase:
        "awaiting-sovereign-approval",
      planId,
      branch:
        clean(plan?.branch) || null,
      proposalId:
        clean(
          firstProposal?.proposalId
        ) || null,
      taskId:
        clean(
          firstProposal?.taskId
        ) || null,
      plan,
      proposalGeneration:
        proposals.data,
      requiresApproval: true,
      sealRequired: true,
      canExecute: false,
      nextAction:
        "authorize-proposal",
      message:
        "Plan y primera propuesta preparados. El ciclo se detuvo antes de aplicar archivos.",
    }),
  };
}

async function inspectCycle(
  seal: string,
  body: any
) {
  const planId = clean(
    body?.planId
  );

  if (!planId) {
    return NextResponse.json(
      {
        ok: false,
        error: "PLAN_ID_REQUIRED",
      },
      {
        status: 400,
      }
    );
  }

  const status = await getJson(
    `/api/kairos/strategic-planner/status?planId=${encodeURIComponent(
      planId
    )}`,
    seal
  );

  if (
    !status.ok ||
    status.data?.ok === false
  ) {
    return NextResponse.json(
      {
        ok: false,
        action: "inspect",
        planId,
        error:
          status.data?.error ||
          "PLAN_STATUS_FAILED",
        upstream: status,
      },
      {
        status: status.status || 409,
      }
    );
  }

  const plan =
    status.data?.plan;

  const pendingTask =
    Array.isArray(plan?.tasks)
      ? plan.tasks.find(
          (task: any) =>
            task?.status ===
              "proposal-created" &&
            clean(task?.proposalId)
        )
      : null;

  const allCompleted =
    Array.isArray(plan?.tasks) &&
    plan.tasks.every(
      (task: any) =>
        task?.status === "completed"
    );

  return NextResponse.json({
    ok: true,
    mode:
      "KAIROS_AUTONOMOUS_CYCLE_V1",
    action: "inspect",
    planId,
    status: plan?.status,
    branch:
      clean(plan?.branch) || null,
    pendingProposal: pendingTask
      ? {
          taskId:
            clean(pendingTask.id),
          proposalId:
            clean(
              pendingTask.proposalId
            ),
          kind:
            clean(pendingTask.kind),
          targets:
            pendingTask.targets || [],
        }
      : null,
    allCompleted,
    plan,
    nextAction: pendingTask
      ? "authorize-proposal"
      : plan?.status === "completed"
      ? null
      : "inspect",
  });
}

async function authorizeProposal(
  seal: string,
  body: any
) {
  const planId = clean(
    body?.planId
  );

  const proposalId = clean(
    body?.proposalId
  );

  if (!planId) {
    return NextResponse.json(
      {
        ok: false,
        error: "PLAN_ID_REQUIRED",
      },
      {
        status: 400,
      }
    );
  }

  if (!proposalId) {
    return NextResponse.json(
      {
        ok: false,
        error: "PROPOSAL_ID_REQUIRED",
      },
      {
        status: 400,
      }
    );
  }

  const proposal =
    await getProposal(proposalId);

  if (!proposal) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "PROPOSAL_NOT_FOUND",
        proposalId,
      },
      {
        status: 404,
      }
    );
  }

  const proposalPlanId = clean(
    (proposal as any)?.metadata
      ?.planId
  );

  const proposalStatus = clean(
    (proposal as any)?.status ||
      "pending"
  ).toLowerCase();

  if (
    proposalPlanId !== planId
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "PROPOSAL_PLAN_MISMATCH",
        planId,
        proposalPlanId,
        proposalId,
      },
      {
        status: 409,
      }
    );
  }

  if (
    proposalStatus !== "pending" &&
    proposalStatus !== "approved"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "PROPOSAL_NOT_PENDING",
        proposalId,
        proposalStatus,
      },
      {
        status: 409,
      }
    );
  }

  const start = await postJson(
    "/api/kairos/orchestrator/start",
    seal,
    {
      proposalId,
    }
  );

  if (
    !start.ok ||
    start.data?.ok === false
  ) {
    return NextResponse.json(
      {
        ok: false,
        phase:
          "start-operation",
        planId,
        proposalId,
        error:
          start.data?.error ||
          "ORCHESTRATOR_START_FAILED",
        upstream: start,
      },
      {
        status: start.status || 409,
      }
    );
  }

  const operationId = clean(
    start.data?.operation
      ?.operationId
  );

  if (!operationId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "OPERATION_ID_MISSING",
        start: start.data,
      },
      {
        status: 409,
      }
    );
  }

  const execute = await postJson(
    "/api/kairos/orchestrator/execute",
    seal,
    {
      operationId,
      branch:
        clean(
          (proposal as any)
            ?.metadata?.branch
        ) || null,
    }
  );

  if (
    !execute.ok ||
    execute.data?.ok === false
  ) {
    return NextResponse.json(
      {
        ok: false,
        phase:
          "execute-proposal",
        planId,
        proposalId,
        operationId,
        error:
          execute.data?.error ||
          "ORCHESTRATOR_EXECUTE_FAILED",
        upstream: execute,
      },
      {
        status:
          execute.status || 409,
      }
    );
  }

  const nextProposal =
    nextProposalFrom(
      execute.data
    );

  /*
   * Existe otra propuesta:
   * detener obligatoriamente el ciclo
   * antes de aplicar el siguiente cambio.
   */
  if (nextProposal) {
    return NextResponse.json({
      ok: true,
      mode:
        "KAIROS_AUTONOMOUS_CYCLE_V1",
      action:
        "authorize-proposal",
      phase:
        "awaiting-next-sovereign-approval",
      planId,
      completedProposalId:
        proposalId,
      completedOperationId:
        operationId,
      nextProposalId:
        nextProposal.proposalId,
      nextTaskId:
        nextProposal.taskId,
      execute:
        execute.data,
      requiresApproval: true,
      sealRequired: true,
      canExecute: false,
      nextAction:
        "authorize-proposal",
      message:
        "La propuesta autorizada fue aplicada. La siguiente propuesta quedó pendiente y exige una nueva autorización.",
    });
  }

  /*
   * No queda otra propuesta de implementación:
   * ejecutar build y programar reinicio.
   */
  const finalize = await postJson(
    "/api/kairos/orchestrator/finalize",
    seal,
    {
      operationId,
    }
  );

  if (
    !finalize.ok ||
    finalize.data?.ok === false
  ) {
    return NextResponse.json(
      {
        ok: false,
        phase: "finalize",
        planId,
        proposalId,
        operationId,
        error:
          finalize.data?.error ||
          "ORCHESTRATOR_FINALIZE_FAILED",
        upstream: finalize,
      },
      {
        status:
          finalize.status || 409,
      }
    );
  }

  return NextResponse.json({
    ok: true,
    mode:
      "KAIROS_AUTONOMOUS_CYCLE_V1",
    action:
      "authorize-proposal",
    phase:
      "restart-scheduled-awaiting-verification",
    planId,
    completedProposalId:
      proposalId,
    operationId,
    execute:
      execute.data,
    finalize:
      finalize.data,
    verifyAfterSeconds:
      Number(
        finalize.data
          ?.verifyAfterSeconds || 8
      ),
    nextAction: "verify",
    message:
      "Última propuesta aplicada y build aprobado. El reinicio fue programado; falta ejecutar Verify.",
  });
}

async function verifyCycle(
  seal: string,
  body: any
) {
  const operationId = clean(
    body?.operationId
  );

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

  const targetPath =
    clean(
      body?.targetPath ||
        body?.pagePath
    ) || undefined;

  const verify = await postJson(
    "/api/kairos/orchestrator/verify",
    seal,
    {
      operationId,
      targetPath,
    }
  );

  if (
    !verify.ok ||
    verify.data?.ok === false
  ) {
    return NextResponse.json(
      {
        ok: false,
        phase: "verify",
        operationId,
        error:
          verify.data?.error ||
          "ORCHESTRATOR_VERIFY_FAILED",
        upstream: verify,
      },
      {
        status: verify.status || 409,
      }
    );
  }

  return NextResponse.json({
    ok: true,
    mode:
      "KAIROS_AUTONOMOUS_CYCLE_V1",
    action: "verify",
    phase: "completed",
    operationId,
    planId:
      clean(
        verify.data
          ?.strategicPlan?.planId
      ) ||
      clean(
        verify.data
          ?.strategicPlan
          ?.plan?.planId
      ) ||
      null,
    strategicStatus:
      clean(
        verify.data
          ?.strategicPlan?.status
      ) || null,
    verify: verify.data,
    nextAction: null,
    message:
      "Verify completado. El pipeline y el plan estratégico quedaron cerrados.",
  });
}

export async function GET(
  req: Request
) {
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

  const url = new URL(req.url);

  const planId = clean(
    url.searchParams.get("planId")
  );

  const seal = clean(
    req.headers.get(
      "x-kairos-seal"
    )
  );

  if (!planId) {
    return NextResponse.json({
      ok: true,
      mode:
        "KAIROS_AUTONOMOUS_CYCLE_V1",
      status: "online",
      actions: [
        "create",
        "inspect",
        "authorize-proposal",
        "verify",
      ],
      sovereignty: {
        automaticApproval: false,
        approvalRequiredPerProposal:
          true,
        sealRequired: true,
      },
    });
  }

  return inspectCycle(
    seal,
    {
      planId,
    }
  );
}

export async function POST(
  req: Request
) {
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

  const action =
    clean(body?.action).toLowerCase();

  const seal = clean(
    req.headers.get(
      "x-kairos-seal"
    )
  );

  try {
    if (action === "create") {
      const result =
        await createCycle(
          seal,
          body
        );

      return result.response;
    }

    if (action === "inspect") {
      return inspectCycle(
        seal,
        body
      );
    }

    if (
      action ===
      "authorize-proposal"
    ) {
      return authorizeProposal(
        seal,
        body
      );
    }

    if (action === "verify") {
      return verifyCycle(
        seal,
        body
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "INVALID_ACTION",
        receivedAction:
          action || null,
        allowedActions: [
          "create",
          "inspect",
          "authorize-proposal",
          "verify",
        ],
      },
      {
        status: 400,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        mode:
          "KAIROS_AUTONOMOUS_CYCLE_FAILED",
        action:
          action || null,
        error:
          error?.message ||
          "AUTONOMOUS_CYCLE_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}
