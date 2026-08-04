module.exports = async function(payload, ctx){
  const fs = require("fs");
  const path = require("path");

  const intentId = String(payload && payload.intentId || "").trim();
  if(!intentId) return { ok:false, error:"intentId requerido" };

  const intentsFile = path.join(ctx.OPS_DIR, "intents", "intents.jsonl");
  if(!fs.existsSync(intentsFile)) return { ok:false, error:"No existe intents.jsonl" };

  const lines = fs.readFileSync(intentsFile, "utf8").split("\n").filter(Boolean);
  let found = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj && obj.intentId === intentId) { found = obj; break; }
    } catch(e) {}
  }
  if(!found) return { ok:false, error:"Intent no encontrado", intentId };

  const plan = found.plan || {};
  const wouldCall = Array.isArray(plan.wouldCall) ? plan.wouldCall : [];

  // Generar propuestas (planner.propose)
  const proposed = await ctx.call("planner.propose", { ideas: wouldCall.map(x => ({
    title: x.module || "(sin modulo)",
    description: "Idea desde intent",
    module: x.module || null,
    payload: x.payload || null
  }))});

  // Revisar propuestas (planner.review)
  const review = await ctx.call("planner.review", { proposals: (proposed && proposed.proposals) ? proposed.proposals : [] });

  return {
    ok:true,
    intentId,
    intent: found.intent,
    meta: found.meta || null,
    wouldCall,
    proposed,
    review,
    execution: "BLOQUEADA (requiere /ops/propose + /ops/approve)"
  };
};
