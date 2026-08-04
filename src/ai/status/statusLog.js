// src/ai/status/statusLog.js
// ORA STEEL - Status Log (blindado contra undefined)
import fs from "fs/promises";
import path from "path";

const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const FILE = path.join(DATA_DIR, "status_events.json");

async function ensure() {
  await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
}

async function readAll() {
  await ensure();
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items) {
  await ensure();
  const payload = JSON.stringify(items ?? [], null, 2); // <-- NUNCA undefined
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, payload, "utf-8");
  await fs.rename(tmp, FILE);
}

export async function logEvent(evt) {
  const safe = {
    ts: new Date().toISOString(),
    ...((evt && typeof evt === "object") ? evt : { type: "unknown", meta: String(evt ?? "") }),
  };
  const all = await readAll();
  all.push(safe);
  await writeAll(all);
  return safe;
}

export async function readEvents(limit = 200) {
  const all = await readAll();
  if (!Number.isFinite(limit) || limit <= 0) return all;
  return all.slice(Math.max(0, all.length - limit));
}
