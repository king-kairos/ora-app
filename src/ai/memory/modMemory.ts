// src/ai/memory/modMemory.ts
import fs from "fs/promises";
import path from "path";

const MEM_DIR = path.join(process.cwd(), "data", "mem");

async function ensureMemDir() {
  await fs.mkdir(MEM_DIR, { recursive: true });
}

function fileFor(module: string) {
  const m = String(module || "ora").toLowerCase();
  return path.join(MEM_DIR, `${m}.jsonl`);
}

export type MemItem = { ts: string; text: string };

export async function pinMemory(module: string, text: string) {
  await ensureMemDir();
  const item: MemItem = { ts: new Date().toISOString(), text };
  await fs.appendFile(fileFor(module), JSON.stringify(item) + "\n", "utf8");
  return item;
}

export async function listMemory(module: string, limit: number = 50): Promise<MemItem[]> {
  try {
    const data = await fs.readFile(fileFor(module), "utf8");
    const lines = data.trim().split("\n").filter(Boolean);
    return lines.slice(-limit).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

export async function clearMemory(module: string) {
  try {
    await fs.unlink(fileFor(module));
  } catch {
    // ignore
  }
}
