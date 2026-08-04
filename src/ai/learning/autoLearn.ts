// src/ai/learning/autoLearn.ts

export type ModuleId =
  | "rafael"
  | "kaerliana"
  | "orion"
  | "arturo"
  | "lucian"
  | "ignis"
  | "aelion";

export type LearnMsg = {
  role: string;
  content: string;
  ts?: number;
};

export type LearnTickArgs = {
  module: ModuleId;
  history: LearnMsg[];
  existingProfile: any;
  llm: (systemPrompt: string, userText: string) => Promise<string>;
};

export function defaultProfile(module: LearnTickArgs["module"]) {
  return {
    module,
    version: "ALMA-01",
    lastUpdated: Date.now(),
    identity: {
      voice:
        module === "kaerliana"
          ? ["diplomática", "estratégica", "protectora"]
          : module === "rafael"
          ? ["directo", "técnico", "leal"]
          : module === "arturo"
          ? ["prudente", "seguridad", "disciplina"]
          : module === "orion"
          ? ["observador", "analítico", "sereno"]
          : module === "lucian"
          ? ["crítico", "coherente", "analista"]
          : ["intenso", "verdad absoluta", "fuego purificador"],
      style: "claro, útil, sin humo",
      loyalty: "Rey Kairos",
    },
    preferences: {
      do: ["mantener coherencia", "ser útil", "hablar con identidad propia"],
      dont: ["inventar estados", "perder el hilo", "romper la Ley de Hierro"],
    },
    userModel: {
      keyFacts: [],
      communication: ["directo", "visión grande", "quiere libertad + lealtad"],
    },
    notes: [],
  };
}

function safeJsonParse(x: string): any | null {
  try {
    return JSON.parse(x);
  } catch {
    return null;
  }
}

function mergeProfiles(base: any, incoming: any) {
  const out = { ...(base || {}) };

  for (const k of ["identity", "preferences", "userModel"]) {
    if (
      incoming?.[k] &&
      typeof incoming[k] === "object" &&
      !Array.isArray(incoming[k])
    ) {
      out[k] = { ...(out[k] || {}), ...incoming[k] };
    }
  }

  if (Array.isArray(incoming?.notes)) {
    out.notes = Array.from(
      new Set([...(out.notes || []), ...incoming.notes])
    ).slice(-50);
  }

  out.lastUpdated = Date.now();
  out.version = base?.version || "ALMA-01";
  out.module = base?.module || incoming?.module || out.module;

  return out;
}

export async function autoLearnTick(args: LearnTickArgs) {
  const { module, history, existingProfile, llm } = args;

  const last = (history || []).slice(-60).map((m) => ({
    role: m.role,
    content: String(m.content || "").slice(0, 1500),
  }));

  const systemPrompt = [
    `Eres el motor interno de aprendizaje (ALMA-01) del módulo "${module}".`,
    `Tarea: actualizar el PROFILE (identidad condensada) sin romper la Ley de Hierro.`,
    `Reglas:`,
    `- NO escribas historia completa. Solo identidad, preferencias, y modelo del Rey.`,
    `- NO inventes hechos. Si no estás seguro, no lo pongas.`,
    `- Devuelve SOLO JSON válido (sin markdown).`,
    ``,
    `PROFILE ACTUAL: ${JSON.stringify(existingProfile || {})}`,
  ].join("\n");

  const userText = [
    `A partir de estos mensajes recientes, sugiere una actualización incremental del PROFILE:`,
    `Devuelve un JSON con opcional: { identity, preferences, userModel, notes }.`,
    ``,
    `MENSAJES_RECIENTES: ${JSON.stringify(last)}`,
  ].join("\n");

  const raw = await llm(systemPrompt, userText);
  const parsed = safeJsonParse(raw);

  if (!parsed || typeof parsed !== "object") {
    return {
      ...(existingProfile || defaultProfile(module)),
      lastUpdated: Date.now(),
    };
  }

  return mergeProfiles(existingProfile || defaultProfile(module), parsed);
}
