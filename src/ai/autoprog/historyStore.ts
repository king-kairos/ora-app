import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Tipos de eventos para la Memoria de ORA
 */
export type HistoryKind = "plan" | "apply" | "commit" | "error" | "verify";

export interface HistoryItem {
  id: string;
  ts: string;
  kind: HistoryKind;
  ok: boolean;
  title?: string;
  goal?: string;
  files?: {
    path: string;
    diff?: string;
    content?: string;
  }[];
  error?: string;
  request?: any; // Guardamos el cuerpo de la petición (limpio)
  result?: any;  // Guardamos el resultado de la operación
}

const HISTORY_DIR = path.join(process.cwd(), "data");
const HISTORY_FILE = path.join(HISTORY_DIR, "autoprog-history.json");

/**
 * Utilidad para evitar errores de estructuras circulares
 */
function safeJsonStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  }, 2);
}

async function ensureStore() {
  await fs.mkdir(HISTORY_DIR, { recursive: true });
  try {
    await fs.access(HISTORY_FILE);
  } catch {
    await fs.writeFile(HISTORY_FILE, "[]", "utf8");
  }
}

async function readAll(): Promise<HistoryItem[]> {
  await ensureStore();
  const raw = await fs.readFile(HISTORY_FILE, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAll(items: HistoryItem[]) {
  await ensureStore();
  const json = safeJsonStringify(items);
  await fs.writeFile(HISTORY_FILE, json, "utf8");
}

/**
 * FUNCIONES QUE USA SERVER.TS (Mantenemos nombres para coherencia)
 */

export async function writeHistory(partial: Omit<HistoryItem, "id" | "ts">): Promise<HistoryItem> {
  const items = await readAll();
  const item: HistoryItem = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    ...partial,
  };
  items.push(item);
  await writeAll(items);
  return item;
}

export async function listHistory(limit = 50): Promise<HistoryItem[]> {
  const items = await readAll();
  return items.slice(-limit).reverse();
}

export async function getHistoryById(id: string): Promise<HistoryItem | undefined> {
  const items = await readAll();
  return items.find((i) => i.id === id);
}

export async function clearHistory() {
  await writeAll([]);
}	
