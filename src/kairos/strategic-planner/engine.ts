import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import { generateProposalPlan } from "@/ai/orchestrator/proposalGenerationEngine";
import { resolveTaskLeader } from "@/ai/council-engine/taskLeaderResolver";

import type {
  StrategicPlan,
  StrategicPlanStatus,
  StrategicTask,
  StrategicTaskKind,
} from "./types";

const PLANS_DIR = path.join(
  process.cwd(),
  "ora-data",
  "strategic-plans"
);

function clean(value: unknown) {
  return String(value || "").trim();
}

function unique(items: string[]) {
  return Array.from(
    new Set(items.map(clean).filter(Boolean))
  );
}

function createPlanId() {
  return `strategic-plan-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}`;
}

function planFile(planId: string) {
  const safeId = clean(planId).replace(/[^a-zA-Z0-9_-]/g, "");

  if (!safeId) {
    throw new Error("INVALID_PLAN_ID");
  }

  return path.join(PLANS_DIR, `${safeId}.json`);
}

async function ensurePlansDir() {
  await fs.mkdir(PLANS_DIR, { recursive: true });
}

function classifyTarget(target: string): StrategicTaskKind {
  const value = target.toLowerCase();

  if (
    value.endsWith("/types.ts") ||
    value.endsWith("types.ts")
  ) {
    return "types";
  }

  if (
    value.includes("mockdata") ||
    value.includes("/data/") ||
    value.endsWith(".json")
  ) {
    return "data";
  }

  if (
    value.includes("/api/") ||
    value.endsWith("/route.ts")
  ) {
    return "api";
  }

  if (
    value.includes("/components/") ||
    value.endsWith("panel.tsx") ||
    value.endsWith("dashboard.tsx")
  ) {
    return "component";
  }

  if (value.endsWith("/page.tsx")) {
    return "page";
  }

  return "integration";
}

function titleForKind(kind: StrategicTaskKind) {
  const titles: Record<StrategicTaskKind, string> = {
    analysis: "Analizar estructura y rama existente",
    types: "Preparar contratos y tipos de datos",
    data: "Preparar datos y estado inicial",
    api: "Preparar rutas y servicios API",
    component: "Preparar componentes funcionales",
    page: "Integrar página principal",
    integration: "Integrar cambios en el sistema existente",
    verification: "Verificar build, servicios y funcionamiento",
  };

  return titles[kind];
}

function descriptionForKind(kind: StrategicTaskKind) {
  const descriptions: Record<StrategicTaskKind, string> = {
    analysis:
      "Confirmar estructura existente, evitar duplicaciones y validar los archivos afectados.",
    types:
      "Definir contratos compartidos antes de construir servicios o interfaz.",
    data:
      "Preparar estructuras de datos, estado inicial o fuentes necesarias.",
    api:
      "Crear o modificar endpoints y lógica de servidor respetando los contratos.",
    component:
      "Crear o modificar componentes reutilizables de la interfaz.",
    page:
      "Integrar los componentes y servicios dentro de la página principal.",
    integration:
      "Conectar la nueva capacidad con módulos, routers o archivos existentes.",
    verification:
      "Entregar las propuestas al Orquestador para build, smoke test, Health Gate y registro.",
  };

  return descriptions[kind];
}

function taskRisk(
  kind: StrategicTaskKind,
  planRisk: "low" | "medium" | "high"
): "low" | "medium" | "high" {
  if (planRisk === "high") return "high";

  if (
    kind === "api" ||
    kind === "integration" ||
    kind === "verification"
  ) {
    return "medium";
  }

  return planRisk;
}

function buildTasks(input: {
  targetFiles: string[];
  leader: string;
  intent: string;
  risk: "low" | "medium" | "high";
}): StrategicTask[] {
  const targets = unique(input.targetFiles);

  const grouped = new Map<StrategicTaskKind, string[]>();

  for (const target of targets) {
    const kind = classifyTarget(target);
    const current = grouped.get(kind) || [];
    current.push(target);
    grouped.set(kind, current);
  }

  const tasks: StrategicTask[] = [];

  const analysisTask: StrategicTask = {
    id: "task-01-analysis",
    order: 1,
    title: titleForKind("analysis"),
    description: descriptionForKind("analysis"),
    kind: "analysis",
    status: "ready",
    dependsOn: [],
    targets,
    proposedBy: resolveTaskLeader(
      "analysis",
      input.intent,
      input.leader
    ),
    risk: "low",
    proposalId: null,
    operationId: null,
  };

  tasks.push(analysisTask);

  const orderedKinds: StrategicTaskKind[] = [
    "types",
    "data",
    "api",
    "component",
    "page",
    "integration",
  ];

  const taskIdByKind = new Map<StrategicTaskKind, string>();
  let order = 2;

  for (const kind of orderedKinds) {
    const kindTargets = unique(grouped.get(kind) || []);

    if (kindTargets.length === 0) continue;

    const taskId = `task-${String(order).padStart(2, "0")}-${kind}`;
    taskIdByKind.set(kind, taskId);

    let dependsOn = [analysisTask.id];

    if (kind === "data" && taskIdByKind.has("types")) {
      dependsOn.push(taskIdByKind.get("types")!);
    }

    if (kind === "api") {
      if (taskIdByKind.has("types")) {
        dependsOn.push(taskIdByKind.get("types")!);
      }

      if (taskIdByKind.has("data")) {
        dependsOn.push(taskIdByKind.get("data")!);
      }
    }

    if (kind === "component") {
      if (taskIdByKind.has("types")) {
        dependsOn.push(taskIdByKind.get("types")!);
      }
    }

    if (kind === "page") {
      if (taskIdByKind.has("component")) {
        dependsOn.push(taskIdByKind.get("component")!);
      }

      if (taskIdByKind.has("api")) {
        dependsOn.push(taskIdByKind.get("api")!);
      }
    }

    if (kind === "integration") {
      for (const dependencyKind of [
        "types",
        "data",
        "api",
        "component",
        "page",
      ] as StrategicTaskKind[]) {
        const dependencyId = taskIdByKind.get(dependencyKind);
        if (dependencyId) dependsOn.push(dependencyId);
      }
    }

    tasks.push({
      id: taskId,
      order,
      title: titleForKind(kind),
      description: descriptionForKind(kind),
      kind,
      status: "blocked",
      dependsOn: unique(dependsOn),
      targets: kindTargets,
      proposedBy: resolveTaskLeader(
        kind,
        input.intent,
        input.leader
      ),
      risk: taskRisk(kind, input.risk),
      proposalId: null,
      operationId: null,
    });

    order += 1;
  }

  const implementationTasks = tasks.filter(
    (task) => task.kind !== "analysis"
  );

  tasks.push({
    id: `task-${String(order).padStart(2, "0")}-verification`,
    order,
    title: titleForKind("verification"),
    description: descriptionForKind("verification"),
    kind: "verification",
    status: "blocked",
    dependsOn:
      implementationTasks.length > 0
        ? implementationTasks.map((task) => task.id)
        : [analysisTask.id],
    targets,
    proposedBy: resolveTaskLeader(
      "verification",
      input.intent,
      input.leader
    ),
    risk: taskRisk("verification", input.risk),
    proposalId: null,
    operationId: null,
  });

  return tasks;
}

export async function createStrategicPlan(input: {
  intent: string;
  branch?: string;
  targetFiles?: string[];
  preferredEssence?: string;
}): Promise<StrategicPlan> {
  const intent = clean(input.intent);

  if (!intent) {
    throw new Error("EMPTY_INTENT");
  }

  const sourcePlan = generateProposalPlan({
    intent,
    branch: clean(input.branch) || undefined,
    targetFiles: Array.isArray(input.targetFiles)
      ? input.targetFiles
      : undefined,
    preferredEssence:
      clean(input.preferredEssence) || undefined,
  });

  const now = new Date().toISOString();
  const planId = createPlanId();

  const tasks = buildTasks({
    targetFiles: sourcePlan.targetFiles,
    leader: sourcePlan.proposedBy,
    intent,
    risk: sourcePlan.risk,
  });

  const strategicPlan: StrategicPlan = {
    planId,
    intent,
    branch: sourcePlan.branch,
    title: sourcePlan.title,
    summary: sourcePlan.summary,
    status: "draft",

    leader: sourcePlan.proposedBy,
    team: sourcePlan.council.team,
    council: sourcePlan.council,
    branchAwareness: sourcePlan.branchAwareness,

    risk: sourcePlan.risk,
    targetFiles: unique(sourcePlan.targetFiles),
    tasks,

    requiresKairosApproval: true,
    sealRequired: true,
    canExecute: false,

    createdAt: now,
    updatedAt: now,
    history: [
      {
        status: "draft",
        timestamp: now,
        message:
          "Plan estratégico creado. No se generaron propuestas ni se modificaron archivos.",
      },
    ],

    sourcePlan: {
      title: sourcePlan.title,
      summary: sourcePlan.summary,
      steps: sourcePlan.steps,
    },
  };

  await ensurePlansDir();

  await fs.writeFile(
    planFile(planId),
    JSON.stringify(strategicPlan, null, 2),
    "utf8"
  );

  return strategicPlan;
}

export async function readStrategicPlan(
  planId: string
): Promise<StrategicPlan | null> {
  try {
    const raw = await fs.readFile(planFile(planId), "utf8");
    return JSON.parse(raw) as StrategicPlan;
  } catch {
    return null;
  }
}

export async function updateStrategicPlanStatus(
  planId: string,
  status: StrategicPlanStatus,
  message: string
): Promise<StrategicPlan | null> {
  const plan = await readStrategicPlan(planId);

  if (!plan) return null;

  const now = new Date().toISOString();

  plan.status = status;
  plan.updatedAt = now;
  plan.history.push({
    status,
    timestamp: now,
    message: clean(message) || `Estado actualizado a ${status}.`,
  });

  await fs.writeFile(
    planFile(planId),
    JSON.stringify(plan, null, 2),
    "utf8"
  );

  return plan;
}

export async function saveStrategicPlan(
  plan: StrategicPlan
): Promise<StrategicPlan> {
  if (!plan || !clean(plan.planId)) {
    throw new Error("INVALID_STRATEGIC_PLAN");
  }

  await ensurePlansDir();

  const updated: StrategicPlan = {
    ...plan,
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    planFile(updated.planId),
    JSON.stringify(updated, null, 2),
    "utf8"
  );

  return updated;
}

export function refreshStrategicTaskReadiness(
  plan: StrategicPlan
): StrategicPlan {
  const completedIds = new Set(
    plan.tasks
      .filter((task) => task.status === "completed")
      .map((task) => task.id)
  );

  const tasks = plan.tasks.map((task) => {
    if (
      task.status === "completed" ||
      task.status === "proposal-created" ||
      task.status === "approved" ||
      task.status === "executing" ||
      task.status === "failed"
    ) {
      return task;
    }

    const dependenciesReady = task.dependsOn.every(
      (dependencyId) => completedIds.has(dependencyId)
    );

    const nextStatus: StrategicTask["status"] =
      dependenciesReady ? "ready" : "blocked";

    return {
      ...task,
      status: nextStatus,
    };
  });

  return {
    ...plan,
    tasks,
    updatedAt: new Date().toISOString(),
  };
}

