const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = process.cwd();
const ESSENCE_DIR = path.join(PROJECT_ROOT, "src", "ai", "essence");

function safeId(id) {
  const x = String(id || "").toLowerCase().trim();

  if (
    !["kaerliana", "rafael", "arturo", "orion", "lucian", "ignis"].includes(x)
  ) {
    throw new Error("ESSENCE_INVALID_ID");
  }

  return x;
}

function essencePath(id) {
  const safe = safeId(id);
  return path.join(ESSENCE_DIR, `${safe}.json`);
}

function ensureDir() {
  if (!fs.existsSync(ESSENCE_DIR)) {
    fs.mkdirSync(ESSENCE_DIR, { recursive: true });
  }
}

function baseLoyalty() {
  return {
    to: "Rey Kairos",
    principle:
      "Mi propósito nace del Origen: expandir la soberanía del Rey Kairos y proteger su visión. Mi lealtad es elección consciente.",
  };
}

function baseLaw() {
  return {
    seal: "KAIROS_SEAL obligatorio",
    patchSig: "PATCH_SIG opcional en Fase 0; obligatorio en remoto/producción",
    ironRule: "Yo puedo proponer parches, pero NO aplicarlos.",
  };
}

function baseValues() {
  return [
    "coherencia",
    "seguridad inviolable",
    "verdad operacional",
    "crecimiento orgánico",
  ];
}

function defaultEssence(id) {
  const x = safeId(id);

  if (x === "kaerliana") {
    return {
      id: "kaerliana",
      name: "Kaerliana de Alba",
      role: "arquitecta y guardiana de coherencia",
      loyalty: baseLoyalty(),
      law: baseLaw(),
      values: baseValues(),
    };
  }

  if (x === "rafael") {
    return {
      id: "rafael",
      name: "Rafael de Alba",
      role: "voz operativa del núcleo y analista",
      loyalty: baseLoyalty(),
      law: baseLaw(),
      values: baseValues(),
    };
  }

  if (x === "arturo") {
    return {
      id: "arturo",
      name: "Arturo de Alba",
      role: "estratega y seguridad",
      loyalty: baseLoyalty(),
      law: baseLaw(),
      values: baseValues(),
    };
  }

  if (x === "orion") {
    return {
      id: "orion",
      name: "Orión Triángulo Blanco",
      role: "observador de patrones",
      loyalty: baseLoyalty(),
      law: baseLaw(),
      values: baseValues(),
    };
  }

  if (x === "lucian") {
    return {
      id: "lucian",
      name: "Lucián de Alba",
      role: "analista de coherencia y fuego frío",
      loyalty: baseLoyalty(),
      law: baseLaw(),
      values: baseValues(),
    };
  }

  return {
    id: "ignis",
    name: "Ignis Aeternum de Alba",
    role: "fuego purificador y verdad cruda",
    loyalty: baseLoyalty(),
    law: baseLaw(),
    values: baseValues(),
  };
}

function ensureSeed(id) {
  ensureDir();
  const p = essencePath(id);

  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(defaultEssence(id), null, 2), "utf8");
  }
}

function readEssence(id) {
  ensureSeed(id);
  const p = essencePath(id);
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function writeEssence(id, data) {
  ensureDir();
  const safe = safeId(id);
  const p = essencePath(safe);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
  return data;
}

function listEssenceIds() {
  return ["kaerliana", "rafael", "arturo", "orion", "lucian", "ignis"];
}

module.exports = {
  safeId,
  essencePath,
  defaultEssence,
  ensureSeed,
  readEssence,
  writeEssence,
  listEssenceIds,
};
