// src/lib/oraApi.ts
type Json = any;

export type OraModule =
  | "kaerliana"
  | "rafael"
  | "arturo"
  | "orion"
  | "lucian"
  | "ignis"
  | "aelion";

type PatchFile = {
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

type PatchPayload = {
  title?: string;
  summary?: string;
  metadata?: any;
  files: PatchFile[];
};

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }
  const env = (process as any)?.env?.NEXT_PUBLIC_ORA_API_BASE;
  return String(env || "http://localhost:3000").replace(/\/+$/, "");
}

function getSealValue(): string {
  if (typeof window === "undefined") return "";

  const localSeal =
    localStorage.getItem("KAIROS_SEAL") ||
    localStorage.getItem("kairos_seal") ||
    sessionStorage.getItem("KAIROS_SEAL") ||
    sessionStorage.getItem("kairos_seal") ||
    "";
return String(localSeal || "").trim();
}

function getPatchSecretValue(): string {
  if (typeof window === "undefined") return "";

  const localSecret =
    localStorage.getItem("KAIROS_PATCH_SECRET") ||
    localStorage.getItem("kairos_patch_secret") ||
    sessionStorage.getItem("KAIROS_PATCH_SECRET") ||
    sessionStorage.getItem("kairos_patch_secret") ||
    "";

  const envSecret =
    (process as any)?.env?.NEXT_PUBLIC_KAIROS_PATCH_SECRET || "";

  return String(localSecret || envSecret || "").trim();
}

function getLegacyPatchSigValue(): string {
  if (typeof window === "undefined") return "";

  const localSig =
    localStorage.getItem("KAIROS_PATCH_SIG") ||
    localStorage.getItem("kairos_patch_sig") ||
    sessionStorage.getItem("KAIROS_PATCH_SIG") ||
    sessionStorage.getItem("kairos_patch_sig") ||
    "";

  const envSig =
    (process as any)?.env?.NEXT_PUBLIC_KAIROS_PATCH_SIG || "";

  return String(localSig || envSig || "").trim();
}

function getAuthHeaders(): Record<string, string> {
  const seal = getSealValue();
  const legacyPatchSig = getLegacyPatchSigValue();

  const headers: Record<string, string> = {};

  if (seal) headers["x-kairos-seal"] = seal;

  if (legacyPatchSig) headers["x-kairos-patch-sig"] = legacyPatchSig;

  return headers;
}

function stableStringify(x: any): string {
  if (x === null || typeof x !== "object") return JSON.stringify(x);
  if (Array.isArray(x)) return "[" + x.map(stableStringify).join(",") + "]";

  const keys = Object.keys(x).sort();

  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify(x[k]))
      .join(",") +
    "}"
  );
}

function randomNonce(size = 16): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toHex(hash);
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );

  return toHex(sig);
}

function isSensitivePatchRoute(url: string): boolean {
  return (
    /\/api\/ora\/autoprog\/apply\//.test(url) ||
    /\/api\/ora\/autoprog\/publish$/.test(url) ||
    /\/api\/autoprog\/apply$/.test(url) ||
    /\/api\/autoprog\/publish$/.test(url)
  );
}

async function buildSensitivePatchHeaders(
  url: string,
  method: string,
  bodyValue: any
): Promise<Record<string, string>> {
  const secret = getPatchSecretValue();
  if (!secret) {
    throw new Error("KAIROS_PATCH_SECRET_MISSING_IN_BROWSER");
  }

  const ts = String(Date.now());
  const nonce = randomNonce(16);
  const canonicalBody = stableStringify(bodyValue ?? {});
  const bodyHash = await sha256Hex(canonicalBody);

  const pathname = new URL(url).pathname;
  const message = `${ts}.${nonce}.${method.toUpperCase()}.${pathname}.${bodyHash}`;
  const signature = await hmacSha256Hex(secret, message);

  return {
    "x-kairos-patch-ts": ts,
    "x-kairos-patch-nonce": nonce,
    "x-kairos-patch-body": bodyHash,
    "x-kairos-patch-sig": signature,
  };
}

async function jfetch(url: string, opts: RequestInit = {}) {
  const method = String(opts.method || "GET").toUpperCase();

  let parsedBody: any = undefined;
  if (typeof opts.body === "string" && opts.body.trim()) {
    try {
      parsedBody = JSON.parse(opts.body);
    } catch {
      parsedBody = opts.body;
    }
  } else if (opts.body != null) {
    parsedBody = opts.body;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(opts.headers as any),
  };

  if (isSensitivePatchRoute(url)) {
    const signedHeaders = await buildSensitivePatchHeaders(
      url,
      method,
      parsedBody ?? {}
    );
    Object.assign(headers, signedHeaders);
  }

  const res = await fetch(url, {
    ...opts,
    method,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let data: Json = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP_${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export const oraApi = {
  async health() {
    return jfetch(`${getBaseUrl()}/api/ora/health`, { method: "GET" });
  },

  async sigStatus() {
    return jfetch(`${getBaseUrl()}/api/ora/sig`, { method: "GET" });
  },

  async warSend(module: OraModule, text: string) {
    return jfetch(`${getBaseUrl()}/api/ora/war/chat`, {
      method: "POST",
      body: JSON.stringify({ module, text }),
    });
  },

  async warHistory(module: OraModule, limit = 120) {
    const u = new URL(`${getBaseUrl()}/api/ora/history`);
    u.searchParams.set("module", module);
    u.searchParams.set("limit", String(limit));
    return jfetch(u.toString(), { method: "GET" });
  },

  async essenceGet(module: OraModule) {
    return jfetch(`${getBaseUrl()}/api/ora/essence/${module}`, {
      method: "GET",
    });
  },

  async evolutionList(module: OraModule) {
    return jfetch(`${getBaseUrl()}/api/ora/essence/evolution/${module}`, {
      method: "GET",
    });
  },

  async evolutionWrite(module: OraModule, note: string) {
    return jfetch(`${getBaseUrl()}/api/ora/essence/evolve`, {
      method: "POST",
      body: JSON.stringify({ module, note }),
    });
  },

  async profileGet(module: OraModule) {
    return jfetch(`${getBaseUrl()}/api/ora/profile/${module}`, {
      method: "GET",
    });
  },

  async learnTick(module: OraModule, limit = 60) {
    return jfetch(`${getBaseUrl()}/api/ora/learn/tick`, {
      method: "POST",
      body: JSON.stringify({ module, limit }),
    });
  },

  async patchPropose(payload: PatchPayload) {
    return jfetch(`${getBaseUrl()}/api/ora/autoprog/propose-manual`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async patchProposeAuto(
    module: OraModule,
    goal: string,
    title = "Auto Patch"
  ) {
    return jfetch(`${getBaseUrl()}/api/ora/autoprog/propose-auto`, {
      method: "POST",
      body: JSON.stringify({ module, goal, title }),
    });
  },

  async patchesList() {
    return jfetch(`${getBaseUrl()}/api/ora/autoprog/list`, {
      method: "GET",
    });
  },

  async patchApprove(id: string) {
    return jfetch(`${getBaseUrl()}/api/ora/autoprog/approve/${id}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async patchApply(id: string) {
    return jfetch(`${getBaseUrl()}/api/ora/autoprog/apply/${id}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async patchArchive(id: string) {
    return jfetch(`${getBaseUrl()}/api/ora/autoprog/archive/${id}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  // ✅ patchPublish corregida (no usa jfetch para evitar lanzar excepción en 504)
  async patchPublish(id: string) {
    const res = await fetch(`${getBaseUrl()}/api/ora/autoprog/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ id }),
      cache: "no-store",
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || data?.message || `HTTP_${res.status}`,
        status: res.status,
        data,
      };
    }
    return data;
  },

  async coherenceLog(limit = 100) {
    const u = new URL(`${getBaseUrl()}/api/ora/coherencia/log`);
    u.searchParams.set("limit", String(limit));
    return jfetch(u.toString(), { method: "GET" });
  },

  async kairosCommand(text: string) {
    return jfetch(`${getBaseUrl()}/api/ora/kairos/command`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  async createBranch(
    name: string,
    branchType = "general",
    supervisor: OraModule = "rafael"
  ) {
    return jfetch(`${getBaseUrl()}/api/ora/autoprog/branch/create`, {
      method: "POST",
      body: JSON.stringify({
        name,
        type: branchType,
        supervisor,
      }),
    });
  },

  async createClone(
    displayName: string,
    branchName: string,
    supervisor: OraModule = "rafael"
  ) {
    return jfetch(`${getBaseUrl()}/api/ora/autoprog/clone/create`, {
      method: "POST",
      body: JSON.stringify({
        displayName,
        branchName,
        supervisor,
      }),
    });
  },

  async autoprogSummary() {
    return jfetch(`${getBaseUrl()}/api/ora/autoprog/summary`, {
      method: "GET",
    });
  },
};
