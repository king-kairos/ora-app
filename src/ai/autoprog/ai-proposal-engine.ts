import { createProposal } from "./proposal-engine";
import { runObservatoryScan } from "./observatory-engine";
import { runMetaPlanner } from "./meta-planner";

type ProposedBy = "rafael" | "orion" | "arturo";

type AIProposalIdea = {
  title: string;
  summary: string;
  type: "improvement";
  risk: "low";
  reason: string;
  proposedBy: ProposedBy;
  source: "scan";
  tags: string[];
  files: any[];
};

function autoprogBrainContent(reason: string) {
  const safeReason = JSON.stringify(reason || "Autoprog brain inicializado.");

  return `// src/ai/autoprog/autoprog-brain.ts
// Generado por ORA Autoprog.
// Propósito: capa base de decisión estructural para futuras modificaciones inteligentes.

export type AutoprogBrainAction = "create" | "modify" | "inspect";

export type AutoprogBrainPlan = {
  ok: boolean;
  action: AutoprogBrainAction;
  targetHint: string;
  reason: string;
  nextStep: string;
};

export function createAutoprogBrainPlan(input: string): AutoprogBrainPlan {
  const text = String(input || "").toLowerCase().trim();

  if (text.includes("kairos") || text.includes("cabina")) {
    return {
      ok: true,
      action: "modify",
      targetHint: "app/kairos",
      reason: "La intención menciona Kairos o cabina.",
      nextStep: "Resolver archivos del panel Kairos y generar patch supervisado.",
    };
  }

  if (
    text.includes("crear") ||
    text.includes("modulo") ||
    text.includes("módulo") ||
    text.includes("ruta") ||
    text.includes("pagina") ||
    text.includes("página")
  ) {
    return {
      ok: true,
      action: "create",
      targetHint: "app",
      reason: "La intención indica creación de módulo, ruta o página.",
      nextStep: "Crear propuesta de nuevo archivo dentro de app/.",
    };
  }

  if (
    text.includes("arreglar") ||
    text.includes("arregla") ||
    text.includes("reparar") ||
    text.includes("repara") ||
    text.includes("modificar") ||
    text.includes("cambiar")
  ) {
    return {
      ok: true,
      action: "modify",
      targetHint: "system",
      reason: "La intención indica modificación o reparación.",
      nextStep: "Buscar archivo relacionado, leer contenido y proponer cambio supervisado.",
    };
  }

  return {
    ok: true,
    action: "inspect",
    targetHint: "system",
    reason: "Intención general sin destino exacto.",
    nextStep: "Escanear estructura y resolver archivos candidatos.",
  };
}

export const AUTOPROG_BRAIN_STATUS = {
  active: true,
  generatedBy: "ai-proposal-engine",
  reason: ${safeReason},
  createdAt: new Date().toISOString(),
};
`;
}

function buildIdea(
  proposedBy: ProposedBy,
  title: string,
  summary: string,
  reason: string
): AIProposalIdea {
  const targetFile = "src/ai/autoprog/autoprog-brain.ts";

  return {
    title,
    summary,
    type: "improvement",
    risk: "low",
    reason,
    proposedBy,
    source: "scan",
    tags: ["ai", "autoprog", "brain", "evolution"],
    files: [
      {
        path: targetFile,
        content: autoprogBrainContent(reason),
      },
    ],
  };
}

function pickIdea(stats: any, totalPending: number): AIProposalIdea | null {
  const MAX_PENDING = 30;

  if (totalPending >= MAX_PENDING) {
    return null;
  }

  const brainReason =
    "Evolución controlada del cerebro autoprog para permitir auto-programación real con propuestas aplicables.";

  if ((stats?.autoprogModulesCount || 0) < 50) {
    return buildIdea(
      "orion",
      "IA refuerza el cerebro autoprog del sistema",
      "Se actualiza el módulo base de inteligencia autoprog para mejorar interpretación, planificación e inspección.",
      brainReason
    );
  }

  if ((stats?.apiRoutesCount || 0) < 120) {
    return buildIdea(
      "arturo",
      "IA propone ampliar rutas internas del núcleo",
      "Se genera una mejora de bajo riesgo para fortalecer la capa API y la evolución controlada.",
      "La IA detectó oportunidad de expansión técnica en la capa de auto-programación."
    );
  }

  return buildIdea(
    "rafael",
    "IA propone mejora continua soberana",
    "Se mantiene activo el flujo evolutivo del núcleo con una propuesta aplicable de bajo riesgo.",
    "El sistema está estable y puede seguir evolucionando bajo supervisión de Kairos."
  );
}

export async function runAIProposalEngine() {
  const observatory = await runObservatoryScan();
  const planner = await runMetaPlanner();

  const totalPending = Number(planner?.totalPending || 0);
  const idea = pickIdea(observatory?.stats || {}, totalPending);

  if (!idea) {
    return {
      ok: true,
      created: false,
      message:
        "La IA revisó el sistema pero no generó propuesta nueva porque alcanzó el límite soberano de pendientes.",
      stats: observatory?.stats || {},
      totalPending,
    };
  }

  const proposal = await createProposal({
    title: idea.title,
    summary: idea.summary,
    type: idea.type,
    risk: idea.risk,
    reason: idea.reason,
    proposedBy: idea.proposedBy,
    source: idea.source,
    tags: idea.tags,
    files: idea.files,
  });

  return {
    ok: true,
    created: true,
    proposal,
    stats: observatory?.stats || {},
    totalPending,
    message:
      "La IA generó una propuesta real con archivo aplicable para el núcleo autoprog.",
  };
}
