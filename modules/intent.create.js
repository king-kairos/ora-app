const fs = require("fs");
const path = require("path");

function safeJson(v){
  try { return JSON.stringify(v); } catch(e){ return "\"[unserializable]\""; }
}

module.exports = async function(payload, ctx){
  const now = new Date();
  const actor = (ctx && ctx.actorId) ? String(ctx.actorId) : "unknown";

  // Guardamos en OPS_DIR/intents (auditado por tu app)
  const base = (ctx && ctx.OPS_DIR) ? String(ctx.OPS_DIR) : process.cwd();
  const dir = path.join(base, "intents");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const intentId = "I-" + Date.now() + "-" + Math.random().toString(16).slice(2);

  const record = {
    ok: true,
    intentId,
    at: now.toISOString(),
    actor,
    // Estructura esperada
    intent: payload && payload.intent ? String(payload.intent) : "(sin_intent)",
    impact: payload && payload.impact ? payload.impact : null,
    risk: payload && payload.risk ? String(payload.risk) : "unknown",
    reason: payload && payload.reason ? String(payload.reason) : "",
    // Lo que el sistema propone hacer (pero NO hace)
    plan: payload && payload.plan ? payload.plan : null,
    meta: payload && payload.meta ? payload.meta : null
  };

  // Append-only (historial)
  const logPath = path.join(dir, "intents.jsonl");
  fs.appendFileSync(logPath, safeJson(record) + "\n", "utf8");

  return { ok: true, intentId, savedTo: logPath, record };
};
