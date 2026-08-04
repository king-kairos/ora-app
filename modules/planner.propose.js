module.exports = async function(payload, ctx){
  const ideas = payload && payload.ideas ? payload.ideas : [];
  const proposals = ideas.map((idea, i) => ({
    title: `Idea ${i+1}: ${idea.title || "Sin titulo"}`,
    description: idea.description || "",
    module: idea.module || null,
    payload: idea.payload || null
  }));
  return { ok:true, generated: proposals.length, proposals };
};