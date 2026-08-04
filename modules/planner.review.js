module.exports = async function(payload, ctx){
  const proposals = (payload && Array.isArray(payload.proposals)) ? payload.proposals : [];

  function riskOf(p){
    const mod = (p && p.module) ? String(p.module) : "";
    const title = (p && p.title) ? String(p.title) : "";
    const desc = (p && p.description) ? String(p.description) : "";
    const text = (mod + " " + title + " " + desc).toLowerCase();

    // Heuristicas simples (mejoraremos luego)
    // net / http / fetch / request => riesgo alto (requiere approval extra)
    if (text.includes("http") || text.includes("fetch") || text.includes("request") || text.includes("internet") || text.includes("net")) {
      return { risk: "high", needs: ["net"], recommend: "revise", reason: "Acceso a internet requiere capability net" };
    }

    // filesystem.write / code.write => riesgo medio (modifica sistema)
    if (mod.includes("code.write") || mod.includes("filesystem.write") || text.includes("overwrite")) {
      return { risk: "medium", needs: ["fs.write"], recommend: "approve", reason: "Escritura en disco: permitido solo bajo aprobacion" };
    }

    // filesystem.read => bajo/medio segun alcance
    if (mod.includes("filesystem.read")) {
      return { risk: "low", needs: ["fs.read"], recommend: "approve", reason: "Lectura controlada" };
    }

    // default
    return { risk: "low", needs: [], recommend: "approve", reason: "No se detecta riesgo" };
  }

  const analysis = proposals.map((p, i) => {
    const r = riskOf(p);
    return {
      index: i + 1,
      title: p && p.title ? p.title : "(sin titulo)",
      module: p && p.module ? p.module : null,
      risk: r.risk,
      needs: r.needs,
      recommend: r.recommend,
      reason: r.reason
    };
  });

  return { ok: true, reviewed: proposals.length, analysis, by: ctx.actorId, at: new Date().toISOString() };
};
