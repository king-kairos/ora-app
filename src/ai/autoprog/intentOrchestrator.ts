import { extractIntent, StructuredIntent } from "../ora/intent";
import { handleIntent, IntentResult } from "./intentHandler";

type OfficialModule =
  | "kaerliana"
  | "rafael"
  | "arturo"
  | "orion"
  | "lucian"
  | "ignis";

const OFFICIAL_MODULES: OfficialModule[] = [
  "kaerliana",
  "rafael",
  "arturo",
  "orion",
  "lucian",
  "ignis",
];

type ConsensusVote = {
  module: OfficialModule;
  opinion: "support" | "neutral" | "reject";
  reason: string;
};

type ConsensusResult = {
  recommendedAction: "approve_proposal" | "review_manually" | "reject";
  confidence: number;
  summary: string;
  votes: ConsensusVote[];
  tensions: string[];
  risk: "low" | "medium" | "high" | "unknown";
};

export type OrchestrationResult = {
  ok: boolean;
  sourceModule: string;
  sourceModuleIsOfficial: boolean;
  rawInput: any;
  detectedIntent: StructuredIntent | null;
  consensus: ConsensusResult | null;
  execution: (IntentResult & { proposalId?: string }) | null;
  message: string;
  generatedAt: string;
};

function isOfficialModule(x: string): x is OfficialModule {
  return OFFICIAL_MODULES.includes(x as OfficialModule);
}

function asObject(value: any): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function looksLikeStructuredIntent(payload: any): payload is StructuredIntent {
  return !!(
    payload &&
    typeof payload === "object" &&
    typeof payload.type === "string" &&
    payload.type.trim() &&
    payload.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
  );
}

function normalizeIntent(payload: any): StructuredIntent | null {
  if (!payload) return null;

  try {
    const extracted = extractIntent(payload);
    if (extracted) {
      return {
        ...extracted,
        module:
          typeof extracted.module === "string"
            ? extracted.module.trim().toLowerCase()
            : undefined,
        timestamp:
          typeof extracted.timestamp === "number" &&
          Number.isFinite(extracted.timestamp)
            ? extracted.timestamp
            : Date.now(),
      };
    }
  } catch {
    // ignore
  }

  if (looksLikeStructuredIntent(payload)) {
    return {
      type: payload.type as StructuredIntent["type"],
      data: asObject(payload.data),
      module:
        typeof payload.module === "string"
          ? payload.module.trim().toLowerCase()
          : undefined,
      timestamp:
        typeof payload.timestamp === "number" &&
        Number.isFinite(payload.timestamp)
          ? payload.timestamp
          : Date.now(),
    };
  }

  return null;
}

function normalizeFilesFromIntent(intent: StructuredIntent) {
  const data = asObject(intent.data);
  if (!Array.isArray(data.files)) return [];

  return data.files
    .map((f: any) => ({
      path: String(f?.path || "").trim(),
      delete: f?.delete === true,
      mode: typeof f?.mode === "string" ? f.mode.trim() : "",
      content: typeof f?.content === "string" ? f.content : undefined,
      marker: typeof f?.marker === "string" ? f.marker : undefined,
      startMarker:
        typeof f?.startMarker === "string" ? f.startMarker : undefined,
      endMarker:
        typeof f?.endMarker === "string" ? f.endMarker : undefined,
      find: typeof f?.find === "string" ? f.find : undefined,
      replaceWith:
        typeof f?.replaceWith === "string" ? f.replaceWith : undefined,
    }))
    .filter((f: any) => f.path);
}

function classifyIntentRisk(
  intent: StructuredIntent
): "low" | "medium" | "high" | "unknown" {
  const type = String(intent.type || "").toUpperCase();
  const files = normalizeFilesFromIntent(intent);

  if (type === "APPLY_PATCH" || type === "ARCHIVE_PATCH") return "high";
  if (type !== "PROPOSE_CODE_CHANGE") return "unknown";
  if (!files.length) return "unknown";

  const touchesCore = files.some(
    (f: any) =>
      f.path === "src/app.ts" ||
      f.path.startsWith("src/ai/core/") ||
      f.path.startsWith("src/ai/security/") ||
      f.path.startsWith("src/ai/autoprog/")
  );

  const hasDelete = files.some((f: any) => f.delete === true);
  const modifiesExisting = files.some((f: any) =>
    [
      "modify-existing-file",
      "replace-between-markers",
      "replace-exact",
      "insert-before-marker",
      "insert-after-marker",
      "append-if-missing",
      "append",
      "prepend",
    ].includes(String(f.mode || "").toLowerCase())
  );

  if (touchesCore || hasDelete) return "high";
  if (modifiesExisting || files.length >= 4) return "medium";
  return "low";
}

function buildConsensus(intent: StructuredIntent): ConsensusResult {
  const type = String(intent.type || "").toUpperCase();
  const risk = classifyIntentRisk(intent);

  if (type === "PROPOSE_CODE_CHANGE") {
    const tensions: string[] = [];
    if (risk === "high") tensions.push("high-risk-target");
    if (risk === "medium") tensions.push("multi-file-or-modify-existing");

    return {
      recommendedAction:
        risk === "high" ? "review_manually" : "approve_proposal",
      confidence: risk === "high" ? 0.86 : risk === "medium" ? 0.91 : 0.95,
      risk,
      tensions,
      summary:
        risk === "high"
          ? "La intención es válida, pero toca una zona sensible. Debe pasar a propuesta y revisión manual antes de ejecutar."
          : risk === "medium"
          ? "La intención es coherente y útil. Debe pasar a propuesta formal con revisión táctica."
          : "La intención representa un cambio estructural válido. Debe pasar a propuesta formal y quedar pendiente de aprobación.",
      votes: [
        {
          module: "rafael",
          opinion: "support",
          reason:
            risk === "high"
              ? "Cambio válido, pero toca una capa sensible."
              : "Cambio claro, operativo y alineado con autoprog.",
        },
        {
          module: "arturo",
          opinion: "support",
          reason:
            risk === "high"
              ? "La estructura es válida, pero merece control adicional."
              : "La estructura del parche es válida para propuesta.",
        },
        {
          module: "orion",
          opinion: "support",
          reason:
            risk === "high"
              ? "No hay anomalía lógica, pero sí sensibilidad de superficie."
              : "No hay anomalía lógica en la intención recibida.",
        },
        {
          module: "kaerliana",
          opinion: "neutral",
          reason:
            risk === "high"
              ? "Debe preservarse la coherencia antes de tocar capa sensible."
              : "La intención es coherente mientras permanezca en capa de propuesta.",
        },
        {
          module: "lucian",
          opinion: "support",
          reason:
            risk === "high"
              ? "La formulación es válida, pero debe pasar por refinamiento soberano."
              : "El formato es preciso y suficientemente delimitado.",
        },
        {
          module: "ignis",
          opinion: risk === "high" ? "neutral" : "support",
          reason:
            risk === "high"
              ? "Debe avanzar, pero con fuego controlado."
              : "No hay falsedad estructural; debe avanzar.",
        },
      ],
    };
  }

  if (type === "APPLY_PATCH" || type === "ARCHIVE_PATCH") {
    return {
      recommendedAction: "review_manually",
      confidence: 0.88,
      risk,
      tensions: ["sensitive-execution"],
      summary:
        "La intención es válida, pero involucra una acción sensible que debe pasar por revisión y sello de Kairos.",
      votes: [
        {
          module: "rafael",
          opinion: "support",
          reason: "Acción válida, pero requiere control soberano.",
        },
        {
          module: "arturo",
          opinion: "neutral",
          reason: "Debe mantenerse dentro de la capa protegida.",
        },
        {
          module: "orion",
          opinion: "support",
          reason: "No hay incoherencia, pero sí sensibilidad operativa.",
        },
        {
          module: "kaerliana",
          opinion: "neutral",
          reason: "Necesita validación final antes de ejecución.",
        },
        {
          module: "lucian",
          opinion: "support",
          reason: "Tiene sentido, pero no debe correr automáticamente.",
        },
        {
          module: "ignis",
          opinion: "neutral",
          reason: "Puede avanzar con revisión soberana.",
        },
      ],
    };
  }

  return {
    recommendedAction: "review_manually",
    confidence: 0.7,
    risk,
    tensions: [],
    summary:
      "La intención fue reconocida, pero su tratamiento debe quedar en revisión manual.",
    votes: [
      {
        module: "rafael",
        opinion: "neutral",
        reason: "Hace falta validación adicional.",
      },
      {
        module: "arturo",
        opinion: "neutral",
        reason: "Puede procesarse con revisión.",
      },
      {
        module: "orion",
        opinion: "neutral",
        reason: "Reconocida sin anomalía crítica.",
      },
      {
        module: "kaerliana",
        opinion: "neutral",
        reason: "Debe preservarse la coherencia de ejecución.",
      },
      {
        module: "lucian",
        opinion: "neutral",
        reason: "Falta más precisión para apoyo total.",
      },
      {
        module: "ignis",
        opinion: "neutral",
        reason: "No se rechaza, pero tampoco se libera sin control.",
      },
    ],
  };
}

function extractProposalId(execution: any): string | undefined {
  const direct = String(execution?.proposalId || "").trim();
  if (direct) return direct;

  const nested = String(execution?.proposal?.id || "").trim();
  if (nested) return nested;

  return undefined;
}

export async function orchestrateIntentFromPayload(input: {
  module: string;
  payload: any;
}): Promise<OrchestrationResult> {
  const sourceModule = String(input?.module || "").trim().toLowerCase();
  const payload = input?.payload;

  const sourceModuleIsOfficial = isOfficialModule(sourceModule);
  const detectedIntent = normalizeIntent(payload);

  if (!detectedIntent) {
    return {
      ok: false,
      sourceModule,
      sourceModuleIsOfficial,
      rawInput: payload,
      detectedIntent: null,
      consensus: null,
      execution: null,
      message: "No se pudo detectar una intención estructurada válida.",
      generatedAt: new Date().toISOString(),
    };
  }

  const consensus = buildConsensus(detectedIntent);

  if (consensus.recommendedAction === "reject") {
    return {
      ok: false,
      sourceModule,
      sourceModuleIsOfficial,
      rawInput: payload,
      detectedIntent,
      consensus,
      execution: null,
      message: consensus.summary || "La intención fue rechazada por consenso.",
      generatedAt: new Date().toISOString(),
    };
  }

  try {
    const execution = await handleIntent(
      detectedIntent,
      sourceModuleIsOfficial ? sourceModule : "rafael"
    );

    const proposalId = extractProposalId(execution);
    const enrichedExecution = execution
      ? {
          ...execution,
          proposalId,
        }
      : null;

    return {
      ok: !!execution?.success,
      sourceModule,
      sourceModuleIsOfficial,
      rawInput: payload,
      detectedIntent,
      consensus,
      execution: enrichedExecution,
      message:
        execution?.message ||
        consensus.summary ||
        "Intent processed by orchestration layer.",
      generatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      ok: false,
      sourceModule,
      sourceModuleIsOfficial,
      rawInput: payload,
      detectedIntent,
      consensus,
      execution: null,
      message: `La intención fue detectada, pero falló la ejecución: ${
        error?.message || "UNKNOWN_EXECUTION_ERROR"
      }`,
      generatedAt: new Date().toISOString(),
    };
  }
}
