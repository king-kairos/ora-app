const fs = require("fs");
const path = require("path");
const { createModule } = require("./module-builder");

const REGISTRY_FILE = path.join(process.cwd(), "ora-data", "module-registry.json");
const PROPOSALS_DIR = path.join(process.cwd(), "ora-data", "proposals");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveRegistry(items) {
  ensureDir(path.dirname(REGISTRY_FILE));
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(items, null, 2), "utf8");
}

function saveProposal(proposal) {
  ensureDir(PROPOSALS_DIR);
  const file = path.join(PROPOSALS_DIR, `${proposal.id}.json`);
  fs.writeFileSync(file, JSON.stringify(proposal, null, 2), "utf8");
}

function parseIntent(intent) {
  const raw = String(intent || "").trim();
  const lower = raw.toLowerCase();

  if (!raw) {
    return { ok: false, reason: "Intent vacío" };
  }

  const match =
    lower.match(/crear\s+modulo\s+(.+)/) ||
    lower.match(/crear\s+m[oó]dulo\s+(.+)/);

  if (!match) {
    return { ok: false, reason: "Intención no reconocida" };
  }

  const requestedName = match[1].trim();
  const moduleName = slugify(requestedName);

  if (!moduleName) {
    return { ok: false, reason: "No se pudo derivar nombre del módulo" };
  }

  return {
    ok: true,
    moduleName,
    requestedName,
    title: `ORA - ${requestedName}`,
    description: `Módulo ${requestedName} generado desde intención por ORA.`,
    branch: "core-expansion"
  };
}

function registerModule(parsed) {
  const registry = loadRegistry();

  const exists = registry.find((x) => x.moduleName === parsed.moduleName);
  if (exists) {
    return { ok: false, exists: true, item: exists };
  }

  const item = {
    id: `module_${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "active",
    moduleName: parsed.moduleName,
    title: parsed.title,
    description: parsed.description,
    branch: parsed.branch,
    source: "intention-engine"
  };

  registry.unshift(item);
  saveRegistry(registry);

  return { ok: true, created: true, item };
}

function createProposal(parsed) {
  const proposal = {
    id: `proposal_${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "pending",
    type: "feature",
    risk: "low",
    source: "intent",
    title: `ORA propone crear módulo ${parsed.moduleName}`,
    summary: `Se interpretó la intención y se generó la estructura base del módulo ${parsed.moduleName}.`,
    target: `app/${parsed.moduleName}`,
    branch: parsed.branch
  };

  saveProposal(proposal);
  return proposal;
}

async function runIntentionEngine(intent) {
  const parsed = parseIntent(intent);

  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason };
  }

  const generated = createModule(parsed.moduleName);

  const registry = registerModule(parsed);
  const proposal = createProposal(parsed);

  return {
    ok: true,
    intent,
    parsed,
    generated,
    registry,
    proposal,
    message: `ORA interpretó la intención y generó el módulo ${parsed.moduleName}.`
  };
}

module.exports = {
  runIntentionEngine
};
