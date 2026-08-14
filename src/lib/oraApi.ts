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

function getAuthHeaders(): Record<string, string> {
  const seal = getSealValue();

  const headers: Record<string, string> = {};

  if (seal) headers["x-kairos-seal"] = seal;

  return headers;
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
    return jfetch(`${getBaseUrl()}/api/kairos/autoprog/apply`, {
      method: "POST",
      body: JSON.stringify({ id }),
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
    return jfetch(
      `${getBaseUrl()}/api/kairos/autoprog/safe-publish`,
      {
        method: "POST",
        body: JSON.stringify({ id }),
      }
    );
  },
};
