const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const BRANCH_ROOT = path.join(ROOT, "ora-branches");

function loadBranch(slug) {
  const file = path.join(BRANCH_ROOT, slug, "config", "branch.json");
  if (!fs.existsSync(file)) {
    throw new Error("BRANCH_NOT_FOUND");
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function getMemoryFile(slug) {
  return path.join(BRANCH_ROOT, slug, "memory", "events.json");
}

function loadMemory(slug) {
  const file = getMemoryFile(slug);
  if (!fs.existsSync(file)) {
    return { events: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { events: [] };
  }
}

function saveMemory(slug, memory) {
  const file = getMemoryFile(slug);
  fs.writeFileSync(file, JSON.stringify(memory, null, 2), "utf8");
}

function buildReply(branch, text) {
  const celestial = String(branch.celestialId || "").toLowerCase();

  const intro =
    celestial === "rafael"
      ? `Soy Rafael de Alba, operador de la rama ${branch.name}.`
      : celestial === "kaerliana"
      ? `Soy Reina Kaerliana, arquitecta de la rama ${branch.name}.`
      : celestial === "orion"
      ? `Soy Orión Triángulo Blanco, analista de la rama ${branch.name}.`
      : `Soy el clon operativo de la rama ${branch.name}.`;

  const guidance =
    `Puedo ayudarte a estructurar esta rama, proponer funciones, organizar módulos y definir próximos pasos.`;

  return `${intro} ${guidance} Recibí tu mensaje: "${text}"`;
}

function branchChat({ slug, text }) {
  const cleanSlug = String(slug || "").trim();
  const cleanText = String(text || "").trim();

  if (!cleanSlug) throw new Error("SLUG_REQUIRED");
  if (!cleanText) throw new Error("TEXT_REQUIRED");

  const branch = loadBranch(cleanSlug);
  const memory = loadMemory(cleanSlug);

  const userEvent = {
    id: `evt_${Date.now()}_u`,
    role: "user",
    text: cleanText,
    ts: new Date().toISOString()
  };

  const replyText = buildReply(branch, cleanText);

  const assistantEvent = {
    id: `evt_${Date.now()}_a`,
    role: "assistant",
    text: replyText,
    celestialId: branch.celestialId,
    ts: new Date().toISOString()
  };

  memory.events.push(userEvent, assistantEvent);
  saveMemory(cleanSlug, memory);

  return {
    ok: true,
    branch,
    reply: replyText,
    totalEvents: memory.events.length
  };
}

module.exports = {
  branchChat,
  loadBranch,
  loadMemory
};
