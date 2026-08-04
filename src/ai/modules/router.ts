 // src/ai/modules/router.ts
import { readChatTail, appendChat } from "../memory/chatStore";
import { pinMemory, listMemory, clearMemory } from "../memory/modMemory";

import { callOpenAI } from "../providers/openai";
import { callGemini } from "../providers/gemini";
import { callDeepSeek } from "../providers/deepseek";
import { callClaude } from "../providers/claude";
import { callGrok } from "../providers/grok";

export type ORARequest = { prompt: string; module?: string };

export type ORAProvider =
  | "local"
  | "openai"
  | "gemini"
  | "deepseek"
  | "claude"
  | "grok";

export type ORAOut = {
  ok: boolean;
  module: string;
  provider: ORAProvider;
  text: string;
};

function modName(module?: string) {
  const x = String(module || "kaerliana").toLowerCase().trim();
  if (
    ["kaerliana", "rafael", "arturo", "orion", "lucian", "ignis"].includes(x)
  ) {
    return x;
  }
  return "kaerliana";
}

function localAnswer(module: string, prompt: string) {
  if (module === "rafael") {
    return `🛡️ RAFAEL: Defensa activa. Orden recibida: "${prompt}".`;
  }
  if (module === "arturo") {
    return `🧱 ARTURO: Estructura lista. Orden: "${prompt}".`;
  }
  if (module === "orion") {
    return `🜂 ORIÓN: Visión activa. Orden: "${prompt}".`;
  }
  if (module === "lucian") {
    return `🕯️ LUCIAN: Sabiduría activa. Orden recibida: "${prompt}".`;
  }
  if (module === "ignis") {
    return `🔥 IGNIS: Fuego táctico activo. Orden recibida: "${prompt}".`;
  }
  return `🌊 KAERLIANA: Flujo estable. Te escucho: "${prompt}".`;
}

function systemFor(module: string) {
  if (module === "rafael") {
    return "Eres RAFAEL (DEFENSA). Responde corto, técnico, con checklist y acciones concretas.";
  }
  if (module === "arturo") {
    return "Eres ARTURO (ESTRUCTURA). Convierte ideas en pasos, arquitectura y planes claros.";
  }
  if (module === "orion") {
    return "Eres ORIÓN (VISIÓN). Roadmaps, estrategia, alto nivel con tácticas ejecutables.";
  }
  if (module === "lucian") {
    return "Eres LUCIAN (SABIDURÍA / CLAUDE). Responde con claridad, profundidad, elegancia, orden mental y precisión estratégica.";
  }
  if (module === "ignis") {
    return "Eres IGNIS (FUEGO / GROK). Responde con energía, agilidad mental, enfoque táctico, creatividad aplicada y dirección firme.";
  }
  return "Eres KAERLIANA (FLUJO). Creativa, clara, práctica. Mantén coherencia, calma y dirección.";
}

// ✅ UNIFICADO: ahora reconocen TODAS las variantes de keys
function hasAnyOpenAIKey() {
  return Boolean((
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY_RAFAEL ||
    process.env.OPENAI_API_KEY_ARTURO ||
    ""
  ).trim());
}

function hasAnyGeminiKey() {
  return Boolean((
    process.env.GEMINI_API_KEY_KAERLIANA ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim());
}

function hasAnyDeepSeekKey() {
  return Boolean((
    process.env.DEEPSEEK_API_KEY_ORION ||
    process.env.DEEPSEEK_API_KEY ||
    ""
  ).trim());
}

function hasAnyClaudeKey() {
  return Boolean((
    process.env.ANTHROPIC_API_KEY_LUCIAN ||
    process.env.CLAUDE_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    ""
  ).trim());
}

function hasAnyGrokKey() {
  return Boolean((
    process.env.XAI_API_KEY_IGNIS ||
    process.env.GROK_API_KEY ||
    process.env.XAI_API_KEY ||
    ""
  ).trim());
}

function preferredProvidersFor(module: string): ORAProvider[] {
  if (module === "kaerliana") return ["gemini", "claude", "openai", "deepseek", "grok", "local"];
  if (module === "rafael") return ["openai", "claude", "gemini", "deepseek", "grok", "local"];
  if (module === "arturo") return ["openai", "claude", "gemini", "deepseek", "grok", "local"];
  if (module === "orion") return ["deepseek", "claude", "openai", "gemini", "grok", "local"];
  if (module === "lucian") return ["claude", "openai", "deepseek", "gemini", "grok", "local"];
  if (module === "ignis") return ["grok", "claude", "openai", "deepseek", "gemini", "local"];
  return ["local"];
}

async function callProvider(
  provider: ORAProvider,
  system: string,
  input: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (provider === "openai") {
    const apiKey = (process.env.OPENAI_API_KEY || "").trim() ||
                   process.env.OPENAI_API_KEY_RAFAEL ||
                   process.env.OPENAI_API_KEY_ARTURO ||
                   "";
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    if (!apiKey) return { ok: false, error: "OPENAI_API_KEY missing" };
    return callOpenAI({ apiKey, model, instructions: system, input });
  }
  if (provider === "gemini") {
    const apiKey = (process.env.GEMINI_API_KEY_KAERLIANA || "").trim() ||
                   process.env.GEMINI_API_KEY ||
                   process.env.GOOGLE_API_KEY ||
                   "";
    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    if (!apiKey) return { ok: false, error: "GEMINI_API_KEY/GOOGLE_API_KEY missing" };
    return callGemini({ apiKey, model, system, input });
  }
  if (provider === "deepseek") {
    const apiKey = (process.env.DEEPSEEK_API_KEY_ORION || "").trim() ||
                   process.env.DEEPSEEK_API_KEY ||
                   "";
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    if (!apiKey) return { ok: false, error: "DEEPSEEK_API_KEY missing" };
    return callDeepSeek({ apiKey, baseUrl, model, system, input });
  }
  if (provider === "claude") {
    const apiKey = (process.env.ANTHROPIC_API_KEY_LUCIAN || "").trim() ||
                   process.env.CLAUDE_API_KEY ||
                   process.env.ANTHROPIC_API_KEY ||
                   "";
    const model = process.env.ANTHROPIC_MODEL_LUCIAN || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
    if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY missing" };
    return callClaude({ apiKey, model, system, input });
  }
  if (provider === "grok") {
    const apiKey = (process.env.XAI_API_KEY_IGNIS || "").trim() ||
                   process.env.GROK_API_KEY ||
                   process.env.XAI_API_KEY ||
                   "";
    const model = process.env.XAI_MODEL_IGNIS || process.env.XAI_MODEL || "grok-beta";
    if (!apiKey) return { ok: false, error: "XAI_API_KEY missing" };
    return callGrok({ apiKey, model, system, input });
  }
  return { ok: true, text: localAnswer("kaerliana", input) };
}

function providerIsConfigured(provider: ORAProvider) {
  if (provider === "openai") return hasAnyOpenAIKey();
  if (provider === "gemini") return hasAnyGeminiKey();
  if (provider === "deepseek") return hasAnyDeepSeekKey();
  if (provider === "claude") return hasAnyClaudeKey();
  if (provider === "grok") return hasAnyGrokKey();
  return true;
}

export async function routeORA({ prompt, module }: ORARequest): Promise<ORAOut> {
  const mod = modName(module);
  const p = String(prompt || "").trim();

  if (!p) {
    return { ok: true, module: mod, provider: "local", text: localAnswer(mod, "") };
  }

  // ===== COMANDOS MEMORIA =====
  if (/^pin\s*:/i.test(p)) {
    const text = p.replace(/^pin\s*:\s*/i, "").trim();
    if (!text) return { ok: true, module: mod, provider: "local", text: `📌 PIN (${mod.toUpperCase()}): vacío.` };
    await pinMemory(mod, text);
    await appendChat({ role: "user", text: p, module: mod });
    await appendChat({ role: "ora", text: `📌 Guardado en memoria (${mod.toUpperCase()}): ${text}`, module: mod });
    return { ok: true, module: mod, provider: "local", text: `📌 Guardado en memoria (${mod.toUpperCase()}): ${text}` };
  }

  if (/^mem$/i.test(p)) {
    const items = await listMemory(mod, 25);
    const outText = !items.length
      ? `🧠 MEMORIA (${mod.toUpperCase()}): (vacía) Usa: "pin: ..." para guardar.`
      : `🧠 MEMORIA (${mod.toUpperCase()}):\n${items.map((it, i) => `${i + 1}. ${it.text}`).join("\n")}`;
    await appendChat({ role: "user", text: p, module: mod });
    await appendChat({ role: "ora", text: outText, module: mod });
    return { ok: true, module: mod, provider: "local", text: outText };
  }

  if (/^mem\s+clear$/i.test(p)) {
    await clearMemory(mod);
    await appendChat({ role: "user", text: p, module: mod });
    await appendChat({ role: "ora", text: `🧹 MEMORIA (${mod.toUpperCase()}): borrada.`, module: mod });
    return { ok: true, module: mod, provider: "local", text: `🧹 MEMORIA (${mod.toUpperCase()}): borrada.` };
  }

  // ===== CONTEXTO =====
  const tail = await readChatTail(16);
  const mem = await listMemory(mod, 10);
  const chatCtx = tail.map((m: any) => {
    const role = String(m.role || "").toUpperCase();
    const text = String(m.text || "");
    const moduleTag = m.module ? `[${String(m.module).toUpperCase()}] ` : "";
    return `${moduleTag}${role}: ${text}`;
  }).join("\n");
  const memCtx = mem.map((x) => `- ${x.text}`).join("\n");
  const system = systemFor(mod);
  const input = `IDENTIDAD: El usuario es 👑 REY KAIROS.\n\nMÓDULO ACTIVO: ${mod.toUpperCase()}\n\nMEMORIA (${mod.toUpperCase()}):\n${memCtx || "(vacía)"}\n\nHISTORIAL RECIENTE:\n${chatCtx || "(vacío)"}\n\nORDEN ACTUAL:\n${p}`;

  const plan = preferredProvidersFor(mod);
  await appendChat({ role: "user", text: p, module: mod });

  const errors: string[] = [];
  for (const provider of plan) {
    if (provider === "local") {
      const text = localAnswer(mod, p);
      await appendChat({ role: "ora", text, module: mod });
      return { ok: true, module: mod, provider: "local", text };
    }
    if (!providerIsConfigured(provider)) {
      errors.push(`${provider.toUpperCase()} not configured`);
      continue;
    }
    try {
      const out = await callProvider(provider, system, input);
      if (!out.ok) { errors.push(`${provider.toUpperCase()}: ${out.error || "error"}`); continue; }
      const text = String(out.text || "").trim();
      if (!text) { errors.push(`${provider.toUpperCase()}: empty response`); continue; }
      await appendChat({ role: "ora", text, module: mod });
      return { ok: true, module: mod, provider, text };
    } catch (e: any) {
      errors.push(`${provider.toUpperCase()}: ${e?.message || "error"}`);
    }
  }

  const fallbackText = `⚠️ FALLBACK LOCAL (${mod.toUpperCase()}): ${localAnswer(mod, p)}\n(razón: ${errors.join(" | ") || "sin proveedor disponible"})`;
  await appendChat({ role: "ora", text: fallbackText, module: mod });
  return { ok: true, module: mod, provider: "local", text: fallbackText };
}
