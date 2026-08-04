// src/ai/ora/intent.ts

export type IntentType =
  | "CREATE_MEMORY"
  | "UPDATE_MEMORY"
  | "DELETE_MEMORY"
  | "LOG_EVENT"
  | "PATCH_MODULE_CONFIG"
  | "PROPOSE_CODE_CHANGE"
  | "APPLY_PATCH"
  | "ARCHIVE_PATCH";

export type StructuredIntent = {
  type: IntentType;
  data: Record<string, any>;
  module?: string;
  timestamp?: number;
};

export type ModuleResponseShape = {
  response?: string;
  intent?: StructuredIntent | null;
};

const VALID_TYPES: IntentType[] = [
  "CREATE_MEMORY",
  "UPDATE_MEMORY",
  "DELETE_MEMORY",
  "LOG_EVENT",
  "PATCH_MODULE_CONFIG",
  "PROPOSE_CODE_CHANGE",
  "APPLY_PATCH",
  "ARCHIVE_PATCH",
];

function isObject(value: any): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeType(value: any): IntentType | null {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return null;
  return VALID_TYPES.includes(raw as IntentType) ? (raw as IntentType) : null;
}

function normalizeModule(value: any): string | undefined {
  const module = String(value || "").trim().toLowerCase();
  return module || undefined;
}

function normalizeTimestamp(value: any): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Date.now();
}

function normalizeData(value: any): Record<string, any> {
  return isObject(value) ? value : {};
}

function buildStructuredIntent(input: {
  type: any;
  data?: any;
  module?: any;
  timestamp?: any;
}): StructuredIntent | null {
  const type = normalizeType(input.type);
  if (!type) return null;

  return {
    type,
    data: normalizeData(input.data),
    module: normalizeModule(input.module),
    timestamp: normalizeTimestamp(input.timestamp),
  };
}

function extractFromIntentWrapper(payload: any): StructuredIntent | null {
  if (!isObject(payload)) return null;
  if (!isObject(payload.intent)) return null;

  return buildStructuredIntent({
    type: payload.intent.type,
    data: payload.intent.data,
    module: payload.intent.module || payload.module,
    timestamp: payload.intent.timestamp || payload.timestamp,
  });
}

function extractFromDirectPayload(payload: any): StructuredIntent | null {
  if (!isObject(payload)) return null;
  if (!payload.type) return null;

  return buildStructuredIntent({
    type: payload.type,
    data: payload.data,
    module: payload.module,
    timestamp: payload.timestamp,
  });
}

function extractFromNestedMessage(payload: any): StructuredIntent | null {
  if (!isObject(payload)) return null;

  const candidates = [
    payload.message,
    payload.payload,
    payload.execution,
    payload.detectedIntent,
    payload.result,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const fromWrapper = extractFromIntentWrapper(candidate);
    if (fromWrapper) return fromWrapper;

    const fromDirect = extractFromDirectPayload(candidate);
    if (fromDirect) return fromDirect;
  }

  return null;
}

function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJsonFromFence(text: string): any | null {
  const match = String(text || "").match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (!match?.[1]) return null;
  return tryParseJson(match[1]);
}

function extractLooseJsonObject(text: string): any | null {
  const src = String(text || "");
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

function extractFromStringPayload(payload: any): StructuredIntent | null {
  const text = String(payload || "").trim();
  if (!text) return null;

  const direct = parseIntentFromString(text);
  if (direct) return direct;

  const fenced = extractJsonFromFence(text);
  if (fenced) {
    const wrapped = extractFromIntentWrapper(fenced);
    if (wrapped) return wrapped;

    const directJson = extractFromDirectPayload(fenced);
    if (directJson) return directJson;
  }

  const loose = extractLooseJsonObject(text);
  if (loose) {
    const wrapped = extractFromIntentWrapper(loose);
    if (wrapped) return wrapped;

    const directJson = extractFromDirectPayload(loose);
    if (directJson) return directJson;
  }

  return null;
}

export function extractIntent(payload: any): StructuredIntent | null {
  if (!payload) return null;

  const fromWrapper = extractFromIntentWrapper(payload);
  if (fromWrapper) return fromWrapper;

  const fromDirect = extractFromDirectPayload(payload);
  if (fromDirect) return fromDirect;

  const fromNested = extractFromNestedMessage(payload);
  if (fromNested) return fromNested;

  if (typeof payload === "string") {
    return extractFromStringPayload(payload);
  }

  if (typeof payload?.response === "string") {
    const fromResponse = extractFromStringPayload(payload.response);
    if (fromResponse) return fromResponse;
  }

  return null;
}

export function createIntent(
  type: IntentType,
  data: Record<string, any>,
  module?: string
): StructuredIntent {
  return {
    type,
    data: normalizeData(data),
    module: normalizeModule(module),
    timestamp: Date.now(),
  };
}

export function intentToString(intent: StructuredIntent): string {
  return `INTENT:${intent.type}:${JSON.stringify(intent.data)}`;
}

export function parseIntentFromString(text: string): StructuredIntent | null {
  const match = String(text || "").match(/INTENT:(\w+):(.+)/s);
  if (!match) return null;

  const [, rawType, dataStr] = match;
  const type = normalizeType(rawType);
  if (!type) return null;

  try {
    const data = JSON.parse(dataStr);
    return {
      type,
      data: normalizeData(data),
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

export function isIntentType(value: any): value is IntentType {
  return normalizeType(value) !== null;
}

export function listIntentTypes(): IntentType[] {
  return [...VALID_TYPES];
}
