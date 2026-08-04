import fs from "fs";
import path from "path";

type Task = {
  title: string;
  description: string;
  files: Array<{ path: string; content: string }>;
};

type Proposal = {
  id: string;
  title: string;
  description: string;
  files: Array<{ path: string; content: string }>;
  status: "proposed" | "approved";
  createdAt: string;
};

const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();
const OPS_DIR = path.join(PROJECT_ROOT, "ops");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const INTERVAL_MS = Number(process.env.OPS_INTERVAL_MS || 30000);

// cola de tareas (lo que el agente puede hacer)
const TASKS_FILE = path.join(OPS_DIR, "agent_tasks.json");

// propuestas pendientes de tu aprobación
const PENDING_FILE = path.join(OPS_DIR, "pending_proposals.json");

// seguridad: max 1 propuesta por ciclo, evita “spam”
const MAX_PROPOSALS_PER_CYCLE = 1;

// header requerido por tu servidor
const KAIROS_ROOT = process.env.KAIROS_ROOT || "KAIROS.ROOT";

function ensureFiles() {
  if (!fs.existsSync(OPS_DIR)) fs.mkdirSync(OPS_DIR, { recursive: true });
  if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, "[]", "utf8");
  if (!fs.existsSync(PENDING_FILE)) fs.writeFileSync(PENDING_FILE, "[]", "utf8");
}

function readJson<T>(file: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(file, "utf8").trim();
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-KAIROS-ROOT": KAIROS_ROOT,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "Respuesta no es JSON", raw: text };
  }
}

async function proposeTask(task: Task) {
  return postJson(`${BASE_URL}/ops/propose`, {
    title: task.title,
    description: task.description,
    files: task.files,
  });
}

function appendPending(proposal: Proposal) {
  const pending = readJson<Proposal[]>(PENDING_FILE, []);
  pending.push(proposal);
  writeJson(PENDING_FILE, pending);
}

function summarizePending(p: any) {
  // tolerante a formatos del server
  const proposal = p?.proposal || p?.approved || p;
  return proposal;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cycleOnce() {
  ensureFiles();

  const tasks = readJson<Task[]>(TASKS_FILE, []);

  if (!tasks.length) {
    console.log("🟡 OPS LOOP: No hay tareas en ops/agent_tasks.json (pon tareas ahí).");
    return;
  }

  // Procesa solo 1 tarea por ciclo por seguridad
  const toRun = tasks.slice(0, MAX_PROPOSALS_PER_CYCLE);
  const remaining = tasks.slice(MAX_PROPOSALS_PER_CYCLE);

  for (const t of toRun) {
    console.log(`🧠 OPS LOOP: Proponiendo -> ${t.title}`);
    const resp = await proposeTask(t);

    if (!resp?.ok) {
      console.log("❌ OPS LOOP: Error proponiendo:", resp);
      // si falla, devolvemos la tarea al inicio para no perderla
      writeJson(TASKS_FILE, [t, ...remaining]);
      return;
    }

    const created = summarizePending(resp);
    console.log("✅ OPS LOOP: Propuesta creada (pendiente de TU aprobación):", created?.id || created);

    // Guarda en pendientes
    appendPending(created as Proposal);

    console.log("📌 Archivo(s):", (created?.files || []).map((f: any) => f.path).join(", "));
  }

  // actualiza cola (quita las tareas procesadas)
  writeJson(TASKS_FILE, remaining);

  console.log("🟢 OPS LOOP: Ciclo terminado. Esperando próximas tareas...");
}

async function main() {
  console.log("🚀 OPS LOOP iniciado");
  console.log("🌐 BASE_URL:", BASE_URL);
  console.log("⏱️ Intervalo:", `${Math.round(INTERVAL_MS / 1000)}s`);
  console.log("📥 Cola de tareas:", "ops/agent_tasks.json");
  console.log("📌 Pendientes:", "ops/pending_proposals.json");

  ensureFiles();

  while (true) {
    try {
      await cycleOnce();
    } catch (e) {
      console.log("❌ OPS LOOP: error inesperado:", e);
    }
    await sleep(INTERVAL_MS);
  }
}

main();
