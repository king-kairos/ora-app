import fs from "fs/promises";
import path from "path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const LOG_PATH = path.join(DATA_DIR, "history.jsonl");
export const MAX_LOG_BYTES = 5 * 1024 * 1024;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

export async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
}

export async function rotateIfNeeded() {
  await ensureDataDir();

  try {
    const st = await fs.stat(LOG_PATH);
    if (st.size < MAX_LOG_BYTES) return;

    const rotated = path.join(DATA_DIR, `history-${stamp()}.jsonl`);
    await fs.rename(LOG_PATH, rotated).catch(() => {});
    await fs.writeFile(LOG_PATH, "").catch(() => {});
  } catch {}
}

export async function appendLog(obj: any) {
  await rotateIfNeeded();
  await fs.appendFile(LOG_PATH, JSON.stringify(obj) + "\n").catch(() => {});
}

/* ======================================================
   LOGS PARA CONSOLA
   ====================================================== */

export function oraLog(...args: any[]) {
  console.log("[ORA]", ...args);
}

export function oraWarn(...args: any[]) {
  console.warn("[ORA WARNING]", ...args);
}

export function oraError(...args: any[]) {
  console.error("[ORA ERROR]", ...args);
}
