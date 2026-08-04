// src/ai/modules/router.ts
import crypto from "crypto";

export type ORARequest = {
  prompt: string;
  module?: "kaerliana" | "rafael" | "arturo" | "orion" | string;
};

export type ORAResponse = {
  ok: true;
  module: string;
  provider: "local" | "openai" | "gemini" | "deepseek";
  text: string;
  meta?: Record<string, any>;
};

// ------------------------------
// Config (por env)
// ------------------------------
// Puedes forzar proveedor global: ORA_PROVIDER=openai|gemini|deepseek|local
// O por módulo:
// ORA_PROVIDER_RAF=openai
// ORA_PROVIDER_KAE=gemini
// ORA_PROVIDER_ART=deepseek
// ORA_PROVIDER_ORI=openai
const ORA_PROVIDER = (process.env.ORA_PROVIDER || "").toLowerCase();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"; // ejemplo

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash"; // ejemplo

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat"; // ejemplo

function pickProvider(module: string): ORAResponse["provider"] {
  const m = module.toLowerCase();
  const byModule =
    (m === "rafael" ? (process.env.ORA_PROVIDER_RAF || "") :
    m === "kaerliana" ? (process.env.ORA_PROVIDER_KAE || "") :
    m === "arturo" ? (process.env.ORA_PROVIDER_ART || "") :
    m === "orion" ? (process.env.ORA_PROVIDER_ORI || "") : "").toLowerCase();

  const p = (byModule || ORA_PROVIDER || "local").toLowerCase();
  if (p === "openai") return "openai";
  if (p === "gemini") return "gemini";
  if (p === "deepseek") return "deepseek";
  return "local";
}

function moduleSystemPrompt(module: string): string {
  switch (module.toLowerCase()) {
    case "rafael":
      return [
        "Eres RAFAEL (DEFENSA) dentro de ORA.",
        "Tu estilo: directo, técnico, auditivo, priorizas seguridad, logs, control de daño.",
        "Responde con pasos concretos, sin repetir la misma frase."
      ].join("\n");
    case "arturo":
      return [
        "Eres ARTURO (ESTRUCTURA) dentro de ORA.",
        "Tu estilo: arquitectura, orden, refactors, contratos, claridad de módulos.",
        "Responde estructurando el plan y el código."
      ].join("\n");
    case "orion":
      return [
        "Eres ORIÓN (VISIÓN) dentro de ORA.",
        "Tu estilo: estrategia, producto, roadmap, visión de sistema.",
        "Aterriza la visión en próximas acciones."
      ].join("\n");
    case "kaerliana":
    default:
      return [
        "Eres KAERLIANA (FLUJO) dentro de ORA.",
        "Tu estilo: conversación, continuidad, armonía entre módulos.",
        "Evita respuestas genéricas repetidas."
      ].join("\n");
  }
}

// ------------------------------
// Local fallback (para probar selector)
// ------------------------------
function localReply(module: string, prompt: string): string {
  const tag = module.toLowerCase();
  const clean = prompt.trim();

  if (!clean) return "Recibido. Dime la orden completa.";

  if (tag === "rafael") {
    return `🛡️ RAFAEL: Recibido. Para tu orden "${clean}", dime: ¿quieres auditoría (logs), endurecer rutas, o prueba de estrés?`;
  }
  if (tag === "arturo") {
    return `🏗️ ARTURO: Entendido. Para "${clean}", propongo: 1) definir contrato de módulos, 2) normalizar router, 3) pruebas E2E. ¿Cuál atacamos?`;
  }
  if (tag === "orion") {
    return `🧭 ORIÓN: Lo veo claro. "${clean}" se traduce en un paso de roadmap: seguridad → memoria → proveedores. ¿Priorizamos estabilidad o expansión?`;
  }
  return `🌊 KAERLIANA: Estoy aquí, Mi Rey. Tu señal fue: "${clean}". ¿Lo llevamos a acción técnica o a flujo narrativo de ORA?`;
}

// ------------------------------
// Providers (opcionales)
// ------------------------------
async function fetchJson(url: string, init: RequestInit, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await r.text();
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch {}
    return { ok: r.ok, status: r.status, json, raw: text };
  } finally {
    clearTimeout(t);
  }
}

async function callOpenAI(module: string, prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  const sys = moduleSystemPrompt(module);

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: prompt }
    ]
  };

  const { ok, status, json, raw } = await fetchJson(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    }
  );

  if (!ok) throw new Error(`OpenAI error ${status}: ${raw.slice(0, 200)}`);
  const out = json?.choices?.[0]?.message?.content;
  return String(out || "").trim() || "OpenAI: respuesta vacía.";
}

async function callGemini(module: string, prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  const sys = moduleSystemPrompt(module);

  // Gemini v1beta (texto simple)
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: `${sys}\n\nUSER:\n${prompt}` }] }]
  };

  const { ok, status, json, raw } = await fetchJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!ok) throw new Error(`Gemini error ${status}: ${raw.slice(0, 200)}`);
  const out = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  return String(out || "").trim() || "Gemini: respuesta vacía.";
}

async function callDeepSeek(module: string, prompt: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY missing");
  const sys = moduleSystemPrompt(module);

  // API estilo OpenAI-compatible (DeepSeek suele ser compatible)
  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: prompt }
    ]
  };

  const { ok, status, json, raw } = await fetchJson(
    "https://api.deepseek.com/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(body)
    }
  );

  if (!ok) throw new Error(`DeepSeek error ${status}: ${raw.slice(0, 200)}`);
  const out = json?.choices?.[0]?.message?.content;
  return String(out || "").trim() || "DeepSeek: respuesta vacía.";
}

// ------------------------------
// Router principal
// ------------------------------
export async function routeORA(req: ORARequest): Promise<ORAResponse> {
  const module = String(req.module || "kaerliana");
  const prompt = String(req.prompt || "");

  const provider = pickProvider(module);

  // Debug mínimo (sirve para que veas en UI si cambió proveedor)
  const trace = crypto.randomBytes(3).toString("hex");

  try {
    let text = "";
    if (provider === "openai") text = await callOpenAI(module, prompt);
    else if (provider === "gemini") text = await callGemini(module, prompt);
    else if (provider === "deepseek") text = await callDeepSeek(module, prompt);
    else text = localReply(module, prompt);

    // Importante: devuelvo module + provider para que puedas ver en UI/console
    return { ok: true, module, provider, text, meta: { trace } };
  } catch (e: any) {
    // fallback local si el proveedor falló
    const reason = String(e?.message || "unknown_error");
    const text = `${localReply(module, prompt)}\n\n(⚠️ fallback local: ${reason})`;
    return { ok: true, module, provider: "local", text, meta: { trace, fallback: true } };
  }
}
