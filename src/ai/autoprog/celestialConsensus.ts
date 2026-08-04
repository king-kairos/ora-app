// src/ai/autoprog/celestialConsensus.ts

import { listCelestialCouncil } from "../core/celestialCouncil";

export type ConsensusVote = {
  moduleId: string;
  name: string;
  stance: "support" | "refine" | "caution";
  reason: string;
  weight: number;
};

export type ConsensusResult = {
  ok: true;
  proposalLayer: true;
  sourceModule: string;
  intentType: string;
  summary: string;
  recommendedAction: "propose" | "refine";
  confidence: number;
  votes: ConsensusVote[];
  tensions: string[];
  generatedAt: string;
};

function normalizeText(value: any): string {
  return String(value || "").trim();
}

function countRiskSignals(text: string): number {
  const lower = text.toLowerCase();

  const signals = [
    "delete",
    "remove",
    "drop",
    "overwrite",
    "rewrite",
    "replace",
    "auth",
    "seal",
    "security",
    "memory",
    "essence",
    "profile",
    "core",
    "execute",
    "remote",
    "command",
    "patchsig",
    "kairos",
  ];

  return signals.reduce((acc, token) => acc + (lower.includes(token) ? 1 : 0), 0);
}

function countStructureSignals(text: string): number {
  const lower = text.toLowerCase();

  const signals = [
    "route",
    "endpoint",
    "module",
    "branch",
    "page",
    "component",
    "api",
    "proposal",
    "feature",
    "registry",
    "council",
    "sovereignty",
    "intent",
    "autoprog",
  ];

  return signals.reduce((acc, token) => acc + (lower.includes(token) ? 1 : 0), 0);
}

function buildIntentText(intent: any): string {
  const data = intent?.data && typeof intent.data === "object" ? intent.data : {};
  const files = Array.isArray(data.files) ? data.files : [];

  const fileText = files
    .map((f: any) => `${String(f?.path || "")} ${String(f?.content || "")}`)
    .join(" ");

  return [
    normalizeText(intent?.type),
    normalizeText(data?.title),
    normalizeText(data?.reason),
    normalizeText(data?.summary),
    fileText,
  ]
    .filter(Boolean)
    .join(" ");
}

function makeVoteForMember(member: any, intent: any): ConsensusVote {
  const text = buildIntentText(intent);
  const risk = countRiskSignals(text);
  const structure = countStructureSignals(text);

  const id = String(member?.id || "").toLowerCase();
  const name = String(member?.name || id);

  if (id === "kaerliana") {
    if (risk >= 4) {
      return {
        moduleId: id,
        name,
        stance: "refine",
        reason: "Detecto alta sensibilidad estructural. Propongo refinar antes de elevar la propuesta.",
        weight: 1.1,
      };
    }

    return {
      moduleId: id,
      name,
      stance: "support",
      reason: "La propuesta mantiene coherencia y puede pasar a capa de proposal.",
      weight: 1.15,
    };
  }

  if (id === "rafael") {
    if (risk >= 6) {
      return {
        moduleId: id,
        name,
        stance: "caution",
        reason: "La intención toca zonas tácticas delicadas. Debe proponerse con contexto fuerte y sin ejecución directa.",
        weight: 1.2,
      };
    }

    return {
      moduleId: id,
      name,
      stance: "support",
      reason: "La dirección es operativa y viable para convertirla en proposal controlada.",
      weight: 1.2,
    };
  }

  if (id === "arturo") {
    if (structure <= 1) {
      return {
        moduleId: id,
        name,
        stance: "refine",
        reason: "Falta definición estructural. Conviene precisar archivos, rutas o alcance.",
        weight: 1.1,
      };
    }

    return {
      moduleId: id,
      name,
      stance: "support",
      reason: "La estructura propuesta es suficiente para una proposal técnica.",
      weight: 1.15,
    };
  }

  if (id === "orion") {
    if (risk >= 5) {
      return {
        moduleId: id,
        name,
        stance: "refine",
        reason: "Veo posibles efectos laterales y conviene separar el cambio en piezas más auditables.",
        weight: 1.05,
      };
    }

    return {
      moduleId: id,
      name,
      stance: "support",
      reason: "No veo anomalías mayores en la capa de propuesta.",
      weight: 1.05,
    };
  }

  if (id === "lucian") {
    if (risk >= 4) {
      return {
        moduleId: id,
        name,
        stance: "refine",
        reason: "La intención necesita más precisión lógica y borde de seguridad antes de proponerse.",
        weight: 1.1,
      };
    }

    return {
      moduleId: id,
      name,
      stance: "support",
      reason: "La propuesta tiene nitidez suficiente para pasar a review soberana.",
      weight: 1.1,
    };
  }

  if (id === "ignis") {
    if (structure === 0) {
      return {
        moduleId: id,
        name,
        stance: "caution",
        reason: "Hay intención, pero falta forma. No me opongo, pero necesita cuerpo real.",
        weight: 1.0,
      };
    }

    return {
      moduleId: id,
      name,
      stance: "support",
      reason: "La propuesta tiene intensidad útil y puede elevarse sin ejecutar nada.",
      weight: 1.0,
    };
  }

  return {
    moduleId: id,
    name,
    stance: "support",
    reason: "Sin objeción relevante en proposal layer.",
    weight: 1.0,
  };
}

function computeConfidence(votes: ConsensusVote[]): number {
  let support = 0;
  let refine = 0;
  let caution = 0;

  for (const vote of votes) {
    if (vote.stance === "support") support += vote.weight;
    if (vote.stance === "refine") refine += vote.weight;
    if (vote.stance === "caution") caution += vote.weight;
  }

  const total = support + refine + caution || 1;
  const raw = Math.round((support / total) * 100);

  return Math.max(1, Math.min(99, raw));
}

function buildTensions(votes: ConsensusVote[]): string[] {
  const tensions: string[] = [];

  const refineCount = votes.filter((v) => v.stance === "refine").length;
  const cautionCount = votes.filter((v) => v.stance === "caution").length;

  if (refineCount > 0) {
    tensions.push(`Hay ${refineCount} voto(s) pidiendo refinamiento antes de ejecutar cualquier elevación futura.`);
  }

  if (cautionCount > 0) {
    tensions.push(`Hay ${cautionCount} voto(s) marcando cautela táctica.`);
  }

  return tensions;
}

function buildSummary(
  sourceModule: string,
  intentType: string,
  votes: ConsensusVote[],
  recommendedAction: "propose" | "refine",
  confidence: number
): string {
  const support = votes.filter((v) => v.stance === "support").length;
  const refine = votes.filter((v) => v.stance === "refine").length;
  const caution = votes.filter((v) => v.stance === "caution").length;

  return [
    `Consensus from ${sourceModule} for ${intentType}.`,
    `Support=${support}, refine=${refine}, caution=${caution}.`,
    `Recommended action=${recommendedAction}.`,
    `Confidence=${confidence}%.`,
  ].join(" ");
}

export function buildCelestialConsensus(
  intent: any,
  sourceModule: string
): ConsensusResult {
  const council = listCelestialCouncil();
  const votes = council.map((member) => makeVoteForMember(member, intent));

  const weightedSupport = votes
    .filter((v) => v.stance === "support")
    .reduce((acc, v) => acc + v.weight, 0);

  const weightedRefine = votes
    .filter((v) => v.stance === "refine")
    .reduce((acc, v) => acc + v.weight, 0);

  const recommendedAction =
    weightedSupport >= weightedRefine ? "propose" : "refine";

  const confidence = computeConfidence(votes);
  const tensions = buildTensions(votes);

  return {
    ok: true,
    proposalLayer: true,
    sourceModule: String(sourceModule || "").trim().toLowerCase(),
    intentType: String(intent?.type || "UNKNOWN_INTENT"),
    summary: buildSummary(
      String(sourceModule || "").trim().toLowerCase(),
      String(intent?.type || "UNKNOWN_INTENT"),
      votes,
      recommendedAction,
      confidence
    ),
    recommendedAction,
    confidence,
    votes,
    tensions,
    generatedAt: new Date().toISOString(),
  };
}
