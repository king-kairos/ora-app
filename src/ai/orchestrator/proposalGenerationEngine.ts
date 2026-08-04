import { routeEssence } from "./essenceRouter";
import { councilEvaluate, CouncilDecision } from "./councilRouter";
import { generateDynamicBranchTargets } from "../autoprog/dynamicBranchGenerator";
import { analyzeBranchAwareness } from "../autoprog/branchAwarenessEngine";
import {
  classifyIntent,
  coreTargetsForIntent,
  type IntentClassification,
} from "./intentClassifier";
import {
  resolveSovereignTargets,
  type TargetResolverResult,
} from "../../kairos/target-resolver/engine";

export type ProposalGenerationInput = {
  intent: string;
  branch?: string;
  targetFiles?: string[];
  preferredEssence?: string;
};

export type GeneratedProposalPlan = {
  ok: true;
  title: string;
  summary: string;
  proposedBy: string;
  branch: string | null;
  targetFiles: string[];
  risk: "low" | "medium" | "high";
  steps: string[];
  requiresApproval: true;
  canExecute: false;
  sealRequired: true;
  branchAwareness: any;
  targetResolver: TargetResolverResult;
  council: CouncilDecision;
  intentClassification: IntentClassification;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugify(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function inferRisk(intent: string): "low" | "medium" | "high" {
  const text = normalizeText(intent);

  if (
    text.includes("delete") ||
    text.includes("borrar") ||
    text.includes("auth") ||
    text.includes("sello") ||
    text.includes("security") ||
    text.includes("seguridad") ||
    text.includes("deploy") ||
    text.includes("pm2") ||
    text.includes("database") ||
    text.includes("db")
  ) {
    return "high";
  }

  if (
    text.includes("crear") ||
    text.includes("mejorar") ||
    text.includes("evolucionar") ||
    text.includes("modificar") ||
    text.includes("patch") ||
    text.includes("endpoint") ||
    text.includes("api") ||
    text.includes("builder") ||
    text.includes("router") ||
    text.includes("orquest") ||
    text.includes("presence") ||
    text.includes("marketing") ||
    text.includes("pollera") ||
    text.includes("agriculture") ||
    text.includes("agricultura")
  ) {
    return "medium";
  }

  return "low";
}

function inferCreatedPageTarget(text: string): string | null {
  const normalized = normalizeText(text);

  const isCreatePage =
    normalized.includes("crear pagina") ||
    normalized.includes("crea pagina") ||
    normalized.includes("crear ruta") ||
    normalized.includes("crear page") ||
    normalized.includes("nueva pagina");

  if (!isCreatePage) return null;

  let rawName = normalized
    .replace(/^crear pagina\s+/i, "")
    .replace(/^crea pagina\s+/i, "")
    .replace(/^crear ruta\s+/i, "")
    .replace(/^crear page\s+/i, "")
    .replace(/^nueva pagina\s+/i, "");

  rawName = rawName
    .replace(/\s+con\s+mensaje.*$/i, "")
    .replace(/\s+que\s+diga.*$/i, "")
    .replace(/\s+para\s+mostrar.*$/i, "")
    .trim();

  const slug = slugify(rawName || "pagina-ora");
  if (!slug) return null;

  return `app/${slug}/page.tsx`;
}

function inferOraPresenceTargets(intent: string): string[] {
  const text = normalizeText(intent);
  const isPresence =
    text.includes("ora presence") ||
    text.includes("presence") ||
    text.includes("presencia") ||
    text.includes("acompanamiento") ||
    text.includes("acompañamiento") ||
    text.includes("crisis") ||
    text.includes("registro emocional") ||
    text.includes("comunidad") ||
    text.includes("meditacion") ||
    text.includes("meditación");

  if (!isPresence) return [];

  return [
    "app/presence/page.tsx",
    "app/presence/components/PresenceDashboard.tsx",
    "app/presence/components/StatsPanel.tsx",
    "app/presence/components/EventsPanel.tsx",
    "app/presence/components/ControlPanel.tsx",
    "app/api/presence/state/route.ts",
    "src/presence/types.ts",
    "src/presence/mockData.ts",
  ];
}

function inferOraMarketingTargets(intent: string): string[] {
  const text = normalizeText(intent);
  const isMarketing =
    text.includes("ora marketing") ||
    text.includes("marketing") ||
    text.includes("campana") ||
    text.includes("campanas") ||
    text.includes("campaña") ||
    text.includes("campañas") ||
    text.includes("leads") ||
    text.includes("clientes") ||
    text.includes("redes sociales") ||
    text.includes("embudo") ||
    text.includes("ventas");

  if (!isMarketing) return [];

  return [
    "app/marketing/page.tsx",
    "app/marketing/components/MarketingDashboard.tsx",
    "app/marketing/components/StatsPanel.tsx",
    "app/marketing/components/EventsPanel.tsx",
    "app/marketing/components/ControlPanel.tsx",
    "app/api/marketing/state/route.ts",
    "src/marketing/types.ts",
    "src/marketing/mockData.ts",
  ];
}

function inferOraPolleraTargets(intent: string): string[] {
  const text = normalizeText(intent);
  const isPollera =
    text.includes("ora pollera") ||
    text.includes("pollera") ||
    text.includes("pollo") ||
    text.includes("pollos") ||
    text.includes("procesamiento de pollos") ||
    text.includes("produccion diaria de pollos") ||
    text.includes("libras vendidas") ||
    text.includes("inventario frio") ||
    text.includes("pedidos del dia") ||
    text.includes("higiene") ||
    text.includes("entregas de pollos");

  if (!isPollera) return [];

  return [
    "app/pollera/page.tsx",
    "app/pollera/components/PolleraDashboard.tsx",
    "app/pollera/components/ProductionPanel.tsx",
    "app/pollera/components/InventoryPanel.tsx",
    "app/pollera/components/OrdersPanel.tsx",
    "app/api/pollera/production/route.ts",
    "app/api/pollera/inventory/route.ts",
    "src/pollera/types.ts",
    "src/pollera/mockData.ts",
  ];
}

function inferOraAgricultureTargets(intent: string): string[] {
  const text = normalizeText(intent);
  const isAgriculture =
    text.includes("ora agriculture") ||
    text.includes("agriculture") ||
    text.includes("agricultura") ||
    text.includes("cultivo") ||
    text.includes("cultivos") ||
    text.includes("siembra") ||
    text.includes("sensores") ||
    text.includes("humedad") ||
    text.includes("riego") ||
    text.includes("ganaderia") ||
    text.includes("campo");

  if (!isAgriculture) return [];

  return [
    "app/agriculture/page.tsx",
    "app/agriculture/components/AgricultureDashboard.tsx",
    "app/agriculture/components/CropPanel.tsx",
    "app/agriculture/components/SensorPanel.tsx",
    "app/agriculture/components/IrrigationPanel.tsx",
    "app/api/agriculture/crops/route.ts",
    "app/api/agriculture/sensors/route.ts",
    "src/agriculture/types.ts",
    "src/agriculture/mockData.ts",
  ];
}

function inferOraHealthTargets(intent: string): string[] {
  const text = normalizeText(intent);
  const isHealth =
    text.includes("ora health") ||
    text.includes("health") ||
    text.includes("salud") ||
    text.includes("medico") ||
    text.includes("medica") ||
    text.includes("clinica") ||
    text.includes("paciente") ||
    text.includes("pacientes") ||
    text.includes("dermatologia") ||
    text.includes("consulta") ||
    text.includes("consultas");

  if (!isHealth) return [];

  return [
    "app/health/page.tsx",
    "app/health/components/HealthDashboard.tsx",
    "app/health/components/PatientPanel.tsx",
    "app/health/components/ConsultationPanel.tsx",
    "app/health/components/AlertPanel.tsx",
    "app/api/health/patients/route.ts",
    "app/api/health/consultations/route.ts",
    "src/health/types.ts",
    "src/health/mockData.ts",
  ];
}

function inferOraSecurityTargets(intent: string): string[] {
  const text = normalizeText(intent);
  const isSecurity =
    text.includes("ora security") ||
    text.includes("security") ||
    text.includes("seguridad") ||
    text.includes("camara") ||
    text.includes("camaras") ||
    text.includes("alerta") ||
    text.includes("alertas") ||
    text.includes("monitoreo") ||
    text.includes("vigilancia");

  if (!isSecurity) return [];

  return [
    "app/security/page.tsx",
    "app/security/components/SecurityDashboard.tsx",
    "app/security/components/CameraGrid.tsx",
    "app/security/components/AlertPanel.tsx",
    "app/security/components/ZoneMap.tsx",
    "app/api/security/cameras/route.ts",
    "app/api/security/events/route.ts",
    "src/security/types.ts",
    "src/security/mockData.ts",
  ];
}

function inferTargets(intent: string, givenTargets?: string[]) {
  if (Array.isArray(givenTargets) && givenTargets.length > 0) {
    return givenTargets.map(clean).filter(Boolean);
  }

  const text = normalizeText(intent);
  const targets: string[] = [];

  const presenceTargets = inferOraPresenceTargets(intent);
  const marketingTargets = inferOraMarketingTargets(intent);
  const agricultureTargets = inferOraAgricultureTargets(intent);
  const polleraTargets = inferOraPolleraTargets(intent);
  const healthTargets = inferOraHealthTargets(intent);
  const securityTargets = inferOraSecurityTargets(intent);

  if (presenceTargets.length > 0) targets.push(...presenceTargets);
  else if (marketingTargets.length > 0) targets.push(...marketingTargets);
  else if (agricultureTargets.length > 0) targets.push(...agricultureTargets);
  else if (polleraTargets.length > 0) targets.push(...polleraTargets);
  else if (healthTargets.length > 0) targets.push(...healthTargets);
  else if (securityTargets.length > 0) targets.push(...securityTargets);

  const createdPageTarget = inferCreatedPageTarget(intent);
  if (createdPageTarget && targets.length === 0) {
    targets.push(createdPageTarget);
  }

  if (text.includes("builder")) targets.push("app/kairos/KairosBuilderPanel.tsx");
  if (text.includes("kairos") && !text.includes("test-kairos")) targets.push("app/kairos/page.tsx");

  if (text.includes("war") || text.includes("esencia") || text.includes("aelion")) {
    targets.push("app/kairos/page.tsx");
    targets.push("src/lib/oraApi.ts");
    targets.push("src/app.ts");
  }

  if (text.includes("router") || text.includes("orquest")) {
    targets.push("src/ai/orchestrator/essenceRouter.ts");
  }

  if (text.includes("proposal") || text.includes("propuesta")) {
    targets.push("src/ai/orchestrator/proposalGenerationEngine.ts");
  }

  if (targets.length === 0) {
    const dynamic = generateDynamicBranchTargets(intent);
    targets.push(...dynamic.targets);
  }

  return Array.from(new Set(targets));
}

export function generateProposalPlan(
  input: ProposalGenerationInput
): GeneratedProposalPlan {
  const intent = clean(input.intent);

  if (!intent) throw new Error("EMPTY_INTENT");

  const intentClassification = classifyIntent(intent);
  const councilDecision = councilEvaluate(intent);

  const routed = input.preferredEssence
    ? routeEssence(intent, input.preferredEssence)
    : null;

  const proposedBy = routed?.moduleId || councilDecision.leader;
  const rawAwareness = analyzeBranchAwareness(intent);

  const requestedBranch = clean(input.branch);

  const branch =
    requestedBranch ||
    (
      intentClassification.scope === "strategic-core"
        ? null
        : intentClassification.branchCandidate ||
          rawAwareness.branch ||
          null
    );

  const coreTargets = coreTargetsForIntent(
    intentClassification,
    intent
  );

  const fallbackTargets =
    coreTargets.length > 0
      ? coreTargets
      : inferTargets(intent);

  const branchAwareness =
    intentClassification.scope === "strategic-core"
      ? {
          ok: true,
          branch: null,
          exists: true,
          mode: "evolve_strategic_core",
          actionVerb: "Mejorar",
          message:
            "La intención pertenece al núcleo estratégico de ORA. " +
            "Las ramas mencionadas como ejemplos no serán tomadas " +
            "como destino del plan.",
        }
      : rawAwareness;

  const targetResolver = resolveSovereignTargets({
    branch,
    givenTargets: input.targetFiles,
    fallbackTargets,
  });

  if (targetResolver.mismatch) {
    throw new Error(
      `TARGET_BRANCH_MISMATCH:${branch || "unknown"}:` +
      targetResolver.invalidTargets.join(",")
    );
  }

  const targetFiles = targetResolver.targetFiles;
  const risk = inferRisk(intent);

  const titleVerb =
    branchAwareness.exists ? "Mejora" : "Creación";

  const actionStep =
    intentClassification.scope === "strategic-core"
      ? "Preparar evolución del núcleo estratégico sin confundir ejemplos con ramas objetivo."
      : branchAwareness.exists
        ? "Preparar evolución de rama existente sin duplicar estructura."
        : "Preparar creación inicial de rama nueva.";

  return {
    ok: true,
    title: `${titleVerb} generada por intención: ${intent.slice(0, 80)}`,
    summary:
      `${branchAwareness.message} ` +
      `Clasificación: ${intentClassification.kind} / ` +
      `${intentClassification.scope}. ` +
      `El Consejo seleccionó la esencia ${proposedBy.toUpperCase()} ` +
      `y preparó un plan estructural multiarchivo bajo control del Sello de Kairos.`,
    proposedBy,
    branch,
    targetFiles,
    risk,
    steps: [
      "Interpretar intención recibida.",
      "Detectar si la rama ya existe mediante Branch Awareness Engine.",
      "Seleccionar esencia responsable mediante Essence Router.",
      "Inferir archivos objetivo iniciales.",
      "Detectar si requiere estructura multiarchivo.",
      actionStep,
      "Clasificar riesgo operativo.",
      "Preparar propuesta en modo no ejecutable.",
      "Esperar aprobación explícita del Sello de Kairos.",
    ],
    requiresApproval: true,
    canExecute: false,
    sealRequired: true,
    branchAwareness,
    targetResolver,
    council: councilDecision,
    intentClassification,
  };
}
