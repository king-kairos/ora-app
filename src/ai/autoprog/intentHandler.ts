import { StructuredIntent } from "../ora/intent";
import { createProposal, getProposal } from "./patchStore";
import { celestialExists } from "../core/celestialCouncil";
import { buildSovereigntySnapshot } from "../core/kairosSovereignty";

export type IntentResult = {
  success: boolean;
  proposalId?: string;
  message: string;
  requiresApproval: boolean;
  metadata?: Record<string, any>;
};

type SafeIntentData = Record<string, any>;

type NormalizedIntentFile = {
  path: string;
  content?: string;
  delete?: boolean;
  mode?: string;
  note?: string;
  marker?: string;
  startMarker?: string;
  endMarker?: string;
  find?: string;
  replaceWith?: string;
};

type ConsensusResult = {
  recommendedAction: "propose" | "review";
  confidence: number;
  risk: "low" | "medium" | "high" | "unknown";
  tensions: string[];
  summary: string;
};

const OFFICIAL_MODULE_FALLBACK = "rafael";
const MAX_INTENT_FILES = 100;
const MAX_TITLE_LENGTH = 240;
const MAX_REASON_LENGTH = 5000;
const MAX_EVENT_LENGTH = 240;
const MAX_PATCH_ID_LENGTH = 120;

const SENSITIVE_PREFIXES = [
  "src/ai/security/",
  "src/ai/core/",
  "src/ai/autoprog/",
];

const HIGH_RISK_EXACT_PATHS = ["src/app.ts"];

function asObject(value: any): SafeIntentData {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeModule(module: string): string {
  return String(module || "").trim().toLowerCase();
}

function getSafeModule(module: string): string {
  const normalized = normalizeModule(module);
  return celestialExists(normalized) ? normalized : OFFICIAL_MODULE_FALLBACK;
}

function isOfficialCelestialModule(module: string): boolean {
  return celestialExists(normalizeModule(module));
}

function normalizeShortString(value: any, max = 240): string {
  return String(value || "").trim().slice(0, max);
}

function normalizeLongString(value: any, max = 5000): string {
  return String(value || "").trim().slice(0, max);
}

function normalizePath(value: any): string {
  return String(value || "").trim().replace(/\\/g, "/");
}

function normalizePatchId(value: any): string {
  return String(value || "").trim().slice(0, MAX_PATCH_ID_LENGTH);
}

function isSafeRelativePath(pathValue: string): boolean {
  const rel = normalizePath(pathValue);

  if (!rel) return false;
  if (rel.startsWith("/")) return false;
  if (rel.startsWith("../")) return false;
  if (rel.includes("/../")) return false;
  if (rel === "..") return false;
  if (/^[a-zA-Z]:\//.test(rel)) return false;
  if (rel.startsWith("//")) return false;

  return true;
}

function buildIntentContext(module: string) {
  const sovereignty = buildSovereigntySnapshot();
  const safeModule = getSafeModule(module);

  return {
    sourceModule: safeModule,
    sourceModuleIsOfficial: isOfficialCelestialModule(module),
    doctrine: sovereignty?.metadata?.doctrine || null,
    executionRequiresSeal: true,
    proposalLayerAutonomy: true,
    generatedAt: new Date().toISOString(),
  };
}

function normalizeFiles(files: any[]): NormalizedIntentFile[] {
  if (!Array.isArray(files)) return [];

  const normalized = files
    .map((f) => ({
      path: normalizePath(f?.path),
      content: typeof f?.content === "string" ? f.content : undefined,
      delete: f?.delete === true,
      mode: typeof f?.mode === "string" ? f.mode.trim() : undefined,
      note: typeof f?.note === "string" ? f.note : undefined,
      marker: typeof f?.marker === "string" ? f.marker : undefined,
      startMarker:
        typeof f?.startMarker === "string" ? f.startMarker : undefined,
      endMarker:
        typeof f?.endMarker === "string" ? f.endMarker : undefined,
      find: typeof f?.find === "string" ? f.find : undefined,
      replaceWith:
        typeof f?.replaceWith === "string" ? f.replaceWith : undefined,
    }))
    .filter((f) => {
      if (!f.path) return false;
      if (!isSafeRelativePath(f.path)) return false;
      if (f.delete === true) return true;
      if (typeof f.content === "string") return true;
      if (typeof f.note === "string") return true;
      if (typeof f.find === "string") return true;
      return false;
    });

  return normalized.slice(0, MAX_INTENT_FILES);
}

function extractTitle(intent: StructuredIntent, module: string, fallback: string) {
  const data = asObject(intent.data);
  const raw = normalizeShortString(data.title, MAX_TITLE_LENGTH);
  if (raw) return raw;
  return `${fallback} · ${getSafeModule(module) || OFFICIAL_MODULE_FALLBACK}`;
}

function extractReason(intent: StructuredIntent, fallback: string) {
  const data = asObject(intent.data);
  const raw = normalizeLongString(data.reason || data.summary, MAX_REASON_LENGTH);
  if (raw) return raw;
  return normalizeLongString(fallback, MAX_REASON_LENGTH);
}

function countByMode(files: NormalizedIntentFile[]) {
  const out: Record<string, number> = {};

  for (const file of files) {
    const mode = String(file.mode || "full-file").trim().toLowerCase();
    out[mode] = (out[mode] || 0) + 1;
  }

  return out;
}

function detectTouchedZones(files: NormalizedIntentFile[]) {
  const zones = new Set<string>();

  for (const f of files) {
    const rel = String(f.path || "");

    if (rel.startsWith("src/")) zones.add("backend-src");
    if (rel.startsWith("app/")) zones.add("next-app");
    if (rel.startsWith("public/")) zones.add("public-assets");
    if (rel.startsWith("data/")) zones.add("data");
  }

  return Array.from(zones);
}

function isSensitiveTarget(pathValue: string): boolean {
  const rel = normalizePath(pathValue);

  if (HIGH_RISK_EXACT_PATHS.includes(rel)) return true;
  return SENSITIVE_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

function detectRisk(files: NormalizedIntentFile[]): "low" | "medium" | "high" | "unknown" {
  if (!files.length) return "unknown";

  const paths = files.map((f) => f.path);
  const modes = files.map((f) => String(f.mode || "full-file").toLowerCase());

  const touchesBackendCore = paths.some((p) => isSensitiveTarget(p));

  const modifyExisting = modes.some(
    (m) =>
      m === "modify-existing-file" ||
      m === "replace-between-markers" ||
      m === "replace-exact" ||
      m === "insert-before-marker" ||
      m === "insert-after-marker" ||
      m === "append-if-missing" ||
      m === "append" ||
      m === "prepend"
  );

  const hasDelete = files.some((f) => f.delete === true);

  if (touchesBackendCore && (modifyExisting || hasDelete)) return "high";
  if (touchesBackendCore) return "high";
  if (hasDelete) return "high";
  if (modifyExisting) return "medium";
  return "low";
}

function buildTags(
  intent: StructuredIntent,
  module: string,
  files: NormalizedIntentFile[]
) {
  const tags = new Set<string>();

  tags.add("intent");
  tags.add(String(intent.type || "").toLowerCase());
  tags.add(getSafeModule(module));

  for (const f of files) {
    if (f.path.startsWith("src/")) tags.add("backend");
    if (f.path.startsWith("app/")) tags.add("frontend");
    if (f.path.startsWith("data/")) tags.add("data");
    if (isSensitiveTarget(f.path)) tags.add("sensitive-target");

    const mode = String(f.mode || "full-file").toLowerCase();
    if (mode) tags.add(mode);
  }

  return Array.from(tags);
}

function buildSimpleConsensus(
  intent: StructuredIntent,
  module: string,
  files: NormalizedIntentFile[]
): ConsensusResult {
  const type = String(intent.type || "").toUpperCase();
  const risk = detectRisk(files);
  const modeCounts = countByMode(files);

  if (type === "PROPOSE_CODE_CHANGE") {
    const tensions: string[] = [];

    if ((modeCounts["modify-existing-file"] || 0) > 0) {
      tensions.push("modify-existing-file");
    }
    if ((modeCounts["replace-exact"] || 0) > 0) {
      tensions.push("replace-exact");
    }
    if (files.some((f) => f.delete === true)) {
      tensions.push("delete-operation");
    }
    if (risk === "high") {
      tensions.push("high-risk-target");
    }

    const recommendedAction = risk === "low" ? "propose" : "review";
    const confidence =
      risk === "high" ? 0.9 : risk === "medium" ? 0.94 : 0.99;

    return {
      recommendedAction,
      confidence,
      risk,
      tensions,
      summary:
        risk === "high"
          ? "La intención es válida, pero toca una zona sensible o destructiva. Debe quedar en propuesta y revisión manual antes de ejecutar."
          : risk === "medium"
          ? `Cambio estructural válido detectado desde ${getSafeModule(module)}. Requiere revisión táctica antes de aprobación.`
          : `Cambio estructural válido detectado desde ${getSafeModule(module)}. Puede vivir en capa de propuesta.`,
    };
  }

  if (type === "APPLY_PATCH" || type === "ARCHIVE_PATCH") {
    return {
      recommendedAction: "review",
      confidence: 0.95,
      risk: "high",
      tensions: ["sensitive-execution"],
      summary: `Acción sensible detectada desde ${getSafeModule(module)}.`,
    };
  }

  return {
    recommendedAction: "review",
    confidence: 0.8,
    risk: "medium",
    tensions: [],
    summary: `Intento reconocido desde ${getSafeModule(module)}.`,
  };
}

function sanitizeIntentMetadata(data: SafeIntentData) {
  const meta =
    data?.meta && typeof data.meta === "object" && !Array.isArray(data.meta)
      ? data.meta
      : null;

  return meta;
}

export async function handleIntent(
  intent: StructuredIntent,
  module: string
): Promise<IntentResult> {
  try {
    switch (intent.type) {
      case "PROPOSE_CODE_CHANGE":
        return await handleCodeChange(intent, module);

      case "APPLY_PATCH":
        return await handleApplyPatch(intent, module);

      case "ARCHIVE_PATCH":
        return await handleArchivePatch(intent, module);

      case "CREATE_MEMORY":
      case "UPDATE_MEMORY":
      case "DELETE_MEMORY":
        return await handleMemoryOperation(intent, module);

      case "LOG_EVENT":
        return await handleLogEvent(intent, module);

      case "PATCH_MODULE_CONFIG":
        return await handleModuleConfig(intent, module);

      default:
        return {
          success: false,
          message: `Intent type ${intent.type} not recognized`,
          requiresApproval: false,
          metadata: {
            intentType: intent.type,
            module: getSafeModule(module),
          },
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Error handling intent: ${error?.message || "UNKNOWN_INTENT_ERROR"}`,
      requiresApproval: false,
      metadata: {
        module: getSafeModule(module),
        intentType: intent?.type || "UNKNOWN",
      },
    };
  }
}

async function handleCodeChange(
  intent: StructuredIntent,
  module: string
): Promise<IntentResult> {
  const data = asObject(intent.data);
  const files = normalizeFiles(data.files);
  const safeModule = getSafeModule(module);
  const context = buildIntentContext(module);

  if (!files.length) {
    return {
      success: false,
      message: "Missing or invalid files array in intent",
      requiresApproval: true,
      metadata: {
        module: safeModule,
        receivedFiles: Array.isArray(data.files) ? data.files.length : 0,
      },
    };
  }

  const targetFiles = files.map((f) => f.path);
  const deleteCount = files.filter((f) => f.delete === true).length;
  const modifyCount = files.filter((f) =>
    [
      "modify-existing-file",
      "insert-before-marker",
      "insert-after-marker",
      "replace-between-markers",
      "replace-exact",
      "append-if-missing",
      "append",
      "prepend",
    ].includes(String(f.mode || "").toLowerCase())
  ).length;
  const writeCount = files.length - deleteCount;
  const touchedZones = detectTouchedZones(files);
  const tags = buildTags(intent, module, files);
  const consensus = buildSimpleConsensus(intent, module, files);
  const patchTitle = extractTitle(intent, module, "Auto-patch proposal");
  const reason = extractReason(
    intent,
    `Cambio propuesto automáticamente por ${safeModule}`
  );

  const proposal = await createProposal({
    title: patchTitle,
    summary: reason,
    type: "patch",
    risk: consensus.risk,
    reason,
    proposedBy: safeModule,
    source: "intent-handler",
    files: files.map((f) => ({
      path: f.path,
      content: f.content,
      delete: f.delete || false,
      mode: f.mode,
      note: f.note,
      marker: f.marker,
      startMarker: f.startMarker,
      endMarker: f.endMarker,
      find: f.find,
      replaceWith: f.replaceWith,
    })),
    metadata: {
      ...context,
      consensus,
      intentType: intent.type,
      fileCount: files.length,
      targetFiles,
      deleteCount,
      modifyCount,
      writeCount,
      touchedZones,
      tags,
      timestamp: intent.timestamp || Date.now(),
      originalMeta: sanitizeIntentMetadata(data),
    },
    tags,
    targetFiles,
  });

  return {
    success: true,
    proposalId: proposal.id,
    message:
      consensus.recommendedAction === "review"
        ? `Proposal created with caution: ${proposal.id}`
        : `Proposal created: ${proposal.id}`,
    requiresApproval: true,
    metadata: {
      proposalId: proposal.id,
      module: safeModule,
      fileCount: files.length,
      targetFiles,
      recommendedAction: consensus.recommendedAction,
      confidence: consensus.confidence,
      tensions: consensus.tensions,
      risk: consensus.risk,
      tags,
      touchedZones,
      deleteCount,
      modifyCount,
    },
  };
}

async function handleApplyPatch(
  intent: StructuredIntent,
  module: string
): Promise<IntentResult> {
  const data = asObject(intent.data);
  const patchId = normalizePatchId(data.patchId);
  const safeModule = getSafeModule(module);

  if (!patchId) {
    return {
      success: false,
      message: "Missing patchId in intent",
      requiresApproval: true,
      metadata: {
        module: safeModule,
      },
    };
  }

  const proposal = await getProposal(patchId);

  if (!proposal) {
    return {
      success: false,
      message: `Proposal ${patchId} not found`,
      requiresApproval: false,
      metadata: {
        patchId,
        module: safeModule,
      },
    };
  }

  if (proposal.status !== "approved") {
    return {
      success: false,
      proposalId: patchId,
      message: `Patch ${patchId} is not approved yet`,
      requiresApproval: true,
      metadata: {
        patchId,
        module: safeModule,
        currentStatus: proposal.status,
        executionGate: "PROPOSAL_MUST_BE_APPROVED_FIRST",
      },
    };
  }

  return {
    success: true,
    proposalId: patchId,
    message: `Patch ${patchId} ready for application (requires Kairos seal)`,
    requiresApproval: true,
    metadata: {
      patchId,
      module: safeModule,
      currentStatus: proposal.status,
      executionGate: "KAIROS_SEAL_REQUIRED",
    },
  };
}

async function handleArchivePatch(
  intent: StructuredIntent,
  module: string
): Promise<IntentResult> {
  const data = asObject(intent.data);
  const patchId = normalizePatchId(data.patchId);
  const safeModule = getSafeModule(module);

  if (!patchId) {
    return {
      success: false,
      message: "Missing patchId in intent",
      requiresApproval: true,
      metadata: {
        module: safeModule,
      },
    };
  }

  const proposal = await getProposal(patchId);

  if (!proposal) {
    return {
      success: false,
      message: `Proposal ${patchId} not found`,
      requiresApproval: false,
      metadata: {
        patchId,
        module: safeModule,
      },
    };
  }

  return {
    success: true,
    proposalId: patchId,
    message: `Patch ${patchId} marked for archiving (requires Kairos seal)`,
    requiresApproval: true,
    metadata: {
      patchId,
      module: safeModule,
      currentStatus: proposal.status,
      executionGate: "KAIROS_SEAL_REQUIRED",
    },
  };
}

async function handleMemoryOperation(
  intent: StructuredIntent,
  module: string
): Promise<IntentResult> {
  const safeModule = getSafeModule(module);

  return {
    success: true,
    message: `Memory operation ${intent.type} queued for module ${safeModule}`,
    requiresApproval: false,
    metadata: {
      module: safeModule,
      intentType: intent.type,
      layer: "memory-proposal",
    },
  };
}

async function handleLogEvent(
  intent: StructuredIntent,
  module: string
): Promise<IntentResult> {
  const data = asObject(intent.data);
  const safeModule = getSafeModule(module);
  const event = normalizeShortString(data.event || "UNNAMED_EVENT", MAX_EVENT_LENGTH);
  const metadata =
    data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? data.metadata
      : {};

  console.log(`[EVENT][${safeModule}] ${event}:`, metadata);

  return {
    success: true,
    message: `Event logged: ${event}`,
    requiresApproval: false,
    metadata: {
      module: safeModule,
      event,
    },
  };
}

async function handleModuleConfig(
  intent: StructuredIntent,
  module: string
): Promise<IntentResult> {
  const safeModule = getSafeModule(module);

  return {
    success: true,
    message: `Module config update queued for ${safeModule}`,
    requiresApproval: true,
    metadata: {
      module: safeModule,
      intentType: intent.type,
      executionGate: "KAIROS_SEAL_REQUIRED",
    },
  };
}

function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJsonFromFence(response: string): any | null {
  const match = String(response || "").match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (!match?.[1]) return null;
  return tryParseJson(match[1]);
}

function extractLooseJsonObject(response: string): any | null {
  const src = String(response || "");
  const start = src.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < src.length; i++) {
    const ch = src[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) {
      const candidate = src.slice(start, i + 1);
      return tryParseJson(candidate);
    }
  }

  return null;
}

function normalizeDirectIntent(type: string, data: any): StructuredIntent {
  return {
    type: type as any,
    data: asObject(data),
    timestamp: Date.now(),
  };
}

export function detectIntentFromResponse(response: string): StructuredIntent | null {
  const fenced = extractJsonFromFence(response);
  if (fenced?.type && fenced?.data) {
    return normalizeDirectIntent(String(fenced.type), fenced.data);
  }

  const loose = extractLooseJsonObject(response);
  if (loose?.type && loose?.data) {
    return normalizeDirectIntent(String(loose.type), loose.data);
  }

  const directMatch = String(response || "").match(/INTENT:(\w+):(.+)/s);
  if (directMatch) {
    const [, type, dataStr] = directMatch;
    const parsed = tryParseJson(dataStr.trim());
    if (parsed) {
      return normalizeDirectIntent(type, parsed);
    }
  }

  return null;
}
