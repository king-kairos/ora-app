import { createProposal } from "@/ai/autoprog/patchStore";
import { generateAutoprogFiles, isAutoprogAlreadyMaterialized } from "@/ai/autoprog/contentGenerator";

import {
  readStrategicPlan,
  refreshStrategicTaskReadiness,
  saveStrategicPlan,
} from "./engine";

import type {
  StrategicPlan,
  StrategicTask,
} from "./types";

const NON_PROPOSAL_KINDS = new Set([
  "analysis",
  "verification",
]);

function clean(value: unknown) {
  return String(value || "").trim();
}

function proposalIntent(
  plan: StrategicPlan,
  task: StrategicTask
) {
  return [
    `PLAN ESTRATÉGICO: ${plan.title}`,
    `RAMA: ${plan.branch || "general"}`,
    `INTENCIÓN GENERAL: ${plan.intent}`,
    `TAREA: ${task.title}`,
    `DESCRIPCIÓN: ${task.description}`,
    `TIPO: ${task.kind}`,
    `ARCHIVOS OBJETIVO:`,
    ...task.targets.map((target) => `- ${target}`),
    ``,
    `REGLAS:`,
    `- Reutilizar la arquitectura existente.`,
    `- No duplicar componentes, rutas ni servicios.`,
    `- Mantener compatibilidad con el sistema actual.`,
    `- Generar contenido aplicable exclusivamente para los archivos objetivo.`,
    `- No ejecutar cambios.`,
    `- Toda aplicación requiere aprobación y Sello de Kairos.`,
  ].join("\n");
}

function completeInternalTasks(
  plan: StrategicPlan
): StrategicPlan {
  const now = new Date().toISOString();

  const tasks = plan.tasks.map((task) => {
    if (
      task.kind === "analysis" &&
      task.status !== "completed"
    ) {
      return {
        ...task,
        status: "completed" as const,
        operationId:
          task.operationId ||
          `internal-analysis-${Date.now()}`,
      };
    }

    return task;
  });

  return {
    ...plan,
    tasks,
    history: [
      ...plan.history,
      {
        status: "proposal-generation",
        timestamp: now,
        message:
          "Análisis estratégico interno completado. Se evaluaron tareas listas para generar propuestas.",
      },
    ],
    updatedAt: now,
  };
}

async function createProposalForTask(
  plan: StrategicPlan,
  task: StrategicTask
) {
  const intent = proposalIntent(plan, task);

  const files = generateAutoprogFiles({
    intent,
    targetFiles: task.targets,
    proposedBy: task.proposedBy || plan.leader,
    risk: task.risk,
    branch: plan.branch,
  });

  try {
    return await createProposal({
      title: `[${plan.branch || "ORA"}] ${task.title}`,
      summary: task.description,
      type: "proposal",
      risk: task.risk,
      reason:
        `Tarea ${task.id} generada desde el Strategic Planner ` +
        `para materializar el plan ${plan.planId}.`,
      proposedBy:
        task.proposedBy ||
        plan.leader ||
        "strategic-planner",
      source: "kairos-strategic-planner",
      files,
      targetFiles: task.targets,
      tags: [
        "strategic-planner",
        "autoprog",
        plan.branch || "general",
        task.kind,
        task.id,
      ],
      metadata: {
        mode: "STRATEGIC_TASK_TO_PROPOSAL_V1",
        planId: plan.planId,
        taskId: task.id,
        taskKind: task.kind,
        branch: plan.branch,
        intent: plan.intent,
        dependencies: task.dependsOn,
        requiresApproval: true,
        canExecute: false,
        sealRequired: true,
      },
    });
  } catch (error: any) {
    const message = clean(error?.message);

    if (message.startsWith("DUPLICATE_PROPOSAL:")) {
      return {
        id: message.split(":").slice(1).join(":"),
        duplicate: true,
      };
    }

    throw error;
  }
}

export async function generateReadyTaskProposals(
  planId: string
) {
  const loaded = await readStrategicPlan(planId);

  if (!loaded) {
    throw new Error("STRATEGIC_PLAN_NOT_FOUND");
  }

  let plan = completeInternalTasks(loaded);
  plan = refreshStrategicTaskReadiness(plan);

  const created: Array<{
    taskId: string;
    proposalId: string;
    duplicate: boolean;
  }> = [];

  const skipped: Array<{
    taskId: string;
    reason: string;
  }> = [];

  /*
   * Flujo progresivo:
   * solamente se materializa la primera tarea ejecutable
   * en cada ciclo. Las siguientes permanecen bloqueadas
   * hasta que sus dependencias sean completadas.
   */
  const readyTask = [...plan.tasks]
    .sort((a, b) => a.order - b.order)
    .find(
      (task) =>
        task.status === "ready" &&
        !task.proposalId &&
        !NON_PROPOSAL_KINDS.has(task.kind)
    );

  if (readyTask) {
    const taskIntent = proposalIntent(plan, readyTask);

    const alreadyMaterialized = isAutoprogAlreadyMaterialized({
      intent: taskIntent,
      targetFiles: readyTask.targets,
      proposedBy: readyTask.proposedBy || plan.leader,
      risk: readyTask.risk,
      branch: plan.branch,
    });

    if (alreadyMaterialized) {
      plan = refreshStrategicTaskReadiness({
        ...plan,
        tasks: plan.tasks.map((task) =>
          task.id === readyTask.id
            ? {
                ...task,
                status: "completed",
                proposalId: null,
              }
            : task
        ),
        history: [
          ...plan.history,
          {
            status: "proposal-generation",
            timestamp: new Date().toISOString(),
            message:
              `La tarea ${readyTask.id} ya estaba materializada. ` +
              `No se creó Proposal y la tarea fue marcada como completada.`,
          },
        ],
        updatedAt: new Date().toISOString(),
      });

      skipped.push({
        taskId: readyTask.id,
        reason:
          "La intención ya estaba materializada. No fue necesario crear Proposal.",
      });
    } else {
      const proposal: any =
        await createProposalForTask(plan, readyTask);

      const proposalId = clean(proposal?.id);

      if (!proposalId) {
        throw new Error(
          `PROPOSAL_ID_MISSING:${readyTask.id}`
        );
      }

      plan = {
      ...plan,
      status: "awaiting-approval",
      tasks: plan.tasks.map((task) =>
        task.id === readyTask.id
          ? {
              ...task,
              status: "proposal-created",
              proposalId,
            }
          : task
      ),
      history: [
        ...plan.history,
        {
          status: "awaiting-approval",
          timestamp: new Date().toISOString(),
          message:
            `Propuesta ${proposalId} creada para la tarea ` +
            `${readyTask.id}. Esperando aprobación soberana.`,
        },
      ],
      updatedAt: new Date().toISOString(),
      };

      created.push({
        taskId: readyTask.id,
        proposalId,
        duplicate: proposal?.duplicate === true,
      });
    }
  } else {
    for (const task of plan.tasks) {
      if (task.proposalId) {
        skipped.push({
          taskId: task.id,
          reason: `Ya vinculada a ${task.proposalId}.`,
        });
      } else if (NON_PROPOSAL_KINDS.has(task.kind)) {
        skipped.push({
          taskId: task.id,
          reason:
            task.kind === "verification"
              ? "La verificación pertenece al pipeline posterior."
              : "Tarea interna sin Proposal de código.",
        });
      } else if (task.status !== "ready") {
        skipped.push({
          taskId: task.id,
          reason: `Estado actual: ${task.status}.`,
        });
      }
    }
  }

  plan = await saveStrategicPlan(plan);

  return {
    ok: true,
    mode: "STRATEGIC_TASK_TO_PROPOSAL_V1",
    plan,
    created,
    skipped,
    createdCount: created.length,
    message:
      created.length > 0
        ? "Propuesta estratégica creada. No fue aprobada, aplicada ni desplegada."
        : "No existen nuevas tareas ejecutables para materializar en este ciclo.",
  };
}

export type AdvanceStrategicPlanInput = {
  planId: string;
  proposalId: string;
  taskId?: string | null;
  operationId?: string | null;
};

export async function advanceStrategicPlanAfterAppliedProposal(
  input: AdvanceStrategicPlanInput
) {
  const planId = clean(input.planId);
  const proposalId = clean(input.proposalId);
  const requestedTaskId = clean(input.taskId);

  if (!planId) {
    throw new Error("PLAN_ID_REQUIRED");
  }

  if (!proposalId) {
    throw new Error("PROPOSAL_ID_REQUIRED");
  }

  const loaded = await readStrategicPlan(planId);

  if (!loaded) {
    throw new Error("STRATEGIC_PLAN_NOT_FOUND");
  }

  const matchedTask = loaded.tasks.find((task) => {
    if (requestedTaskId && task.id !== requestedTaskId) {
      return false;
    }

    return clean(task.proposalId) === proposalId;
  });

  if (!matchedTask) {
    throw new Error(
      `STRATEGIC_TASK_PROPOSAL_NOT_FOUND:${proposalId}`
    );
  }

  const now = new Date().toISOString();

  let plan: StrategicPlan = {
    ...loaded,
    status: "proposal-generation",
    tasks: loaded.tasks.map((task) =>
      task.id === matchedTask.id
        ? {
            ...task,
            status: "completed",
            operationId:
              clean(input.operationId) ||
              task.operationId ||
              null,
          }
        : task
    ),
    history: [
      ...loaded.history,
      {
        status: "proposal-generation",
        timestamp: now,
        message:
          `Tarea ${matchedTask.id} completada mediante ` +
          `la propuesta aplicada ${proposalId}.`,
      },
    ],
    updatedAt: now,
  };

  plan = refreshStrategicTaskReadiness(plan);

  const remainingImplementationTasks = plan.tasks.filter(
    (task) =>
      !NON_PROPOSAL_KINDS.has(task.kind) &&
      task.status !== "completed"
  );

  if (remainingImplementationTasks.length === 0) {
    const verificationTask = plan.tasks.find(
      (task) => task.kind === "verification"
    );

    plan = {
      ...plan,
      status: verificationTask
        ? "ready"
        : "completed",
      history: [
        ...plan.history,
        {
          status: verificationTask
            ? "ready"
            : "completed",
          timestamp: new Date().toISOString(),
          message: verificationTask
            ? "Todas las tareas de implementación fueron completadas. La verificación final está lista."
            : "Todas las tareas estratégicas fueron completadas.",
        },
      ],
    };
  } else {
    plan = {
      ...plan,
      status: "ready",
      history: [
        ...plan.history,
        {
          status: "ready",
          timestamp: new Date().toISOString(),
          message:
            "El plan avanzó y puede generar la siguiente propuesta ejecutable.",
        },
      ],
    };
  }

  return await saveStrategicPlan(plan);
}
export type FinalVerificationChecks = {
  typescript: boolean;
  build: boolean;
  pm2: boolean;
  publicRoute: boolean;
  apiRoute: boolean;
};

export type CompleteStrategicPlanAfterVerificationInput = {
  planId: string;
  checks: FinalVerificationChecks;
  operationId?: string | null;
  message?: string | null;
};

export async function completeStrategicPlanAfterVerification(
  input: CompleteStrategicPlanAfterVerificationInput
) {
  const planId = clean(input.planId);

  if (!planId) {
    throw new Error("PLAN_ID_REQUIRED");
  }

  const loaded = await readStrategicPlan(planId);

  if (!loaded) {
    throw new Error("STRATEGIC_PLAN_NOT_FOUND");
  }

  const checks = input.checks || {
    typescript: false,
    build: false,
    pm2: false,
    publicRoute: false,
    apiRoute: false,
  };

  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name);

  if (failedChecks.length > 0) {
    throw new Error(
      `FINAL_VERIFICATION_FAILED:${failedChecks.join(",")}`
    );
  }

  const incompleteImplementationTasks = loaded.tasks.filter(
    (task) =>
      task.kind !== "analysis" &&
      task.kind !== "verification" &&
      task.status !== "completed"
  );

  if (incompleteImplementationTasks.length > 0) {
    throw new Error(
      "IMPLEMENTATION_TASKS_INCOMPLETE:" +
      incompleteImplementationTasks
        .map((task) => task.id)
        .join(",")
    );
  }

  const verificationTask = loaded.tasks.find(
    (task) => task.kind === "verification"
  );

  if (!verificationTask) {
    throw new Error("VERIFICATION_TASK_NOT_FOUND");
  }

  if (
    verificationTask.status !== "ready" &&
    verificationTask.status !== "completed"
  ) {
    throw new Error(
      `VERIFICATION_TASK_NOT_READY:${verificationTask.status}`
    );
  }

  const now = new Date().toISOString();

  const plan: StrategicPlan = {
    ...loaded,
    status: "completed",
    tasks: loaded.tasks.map((task) =>
      task.id === verificationTask.id
        ? {
            ...task,
            status: "completed",
            operationId:
              clean(input.operationId) ||
              task.operationId ||
              `final-verification-${Date.now()}`,
          }
        : task
    ),
    history: [
      ...loaded.history,
      {
        status: "completed",
        timestamp: now,
        message:
          clean(input.message) ||
          "Plan estratégico cerrado automáticamente por Final Verification Engine. TypeScript, build, PM2, ruta pública y API fueron validados.",
      },
    ],
    updatedAt: now,
  };

  const saved = await saveStrategicPlan(plan);

  return {
    ok: true,
    mode: "FINAL_VERIFICATION_ENGINE_V1",
    planId: saved.planId,
    status: saved.status,
    verificationTaskId: verificationTask.id,
    checks,
    plan: saved,
    message:
      "Verificación final completada. El plan estratégico quedó cerrado.",
  };
}
