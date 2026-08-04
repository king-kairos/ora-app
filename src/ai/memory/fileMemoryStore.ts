// src/ai/memory/fileMemoryStore.ts
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { MemoryStore, MemoryRecord, MemorySearchResult } from "./memoryStore.js";

const MEMORY_DIR = path.join(process.cwd(), "data", "memory");
const MEMORY_FILE = path.join(MEMORY_DIR, "memory.jsonl");

function makeId() {
  return crypto.randomBytes(12).toString("hex");
}

export class FileMemoryStore implements MemoryStore {
  private async ensureDir() {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
  }

  async save(record: Omit<MemoryRecord, "id"> & { id?: string }): Promise<MemoryRecord> {
    await this.ensureDir();

    const full: MemoryRecord = {
      id: record.id || makeId(),
      ts: record.ts,
      module: record.module,
      role: record.role,
      content: record.content,
      meta: record.meta,
    };

    // Esto CREARÁ el archivo en el primer write
    await fs.appendFile(MEMORY_FILE, JSON.stringify(full) + "\n", "utf-8");
    return full;
  }

  async recent(limit = 20): Promise<MemoryRecord[]> {
    await this.ensureDir();
    try {
      const data = await fs.readFile(MEMORY_FILE, "utf-8");
      const lines = data.split("\n").filter(Boolean);
      const slice = lines.slice(-Math.max(1, limit));
      return slice.map((l) => JSON.parse(l)) as MemoryRecord[];
    } catch {
      return [];
    }
  }

  async search(query: string, limit = 50): Promise<MemorySearchResult> {
    await this.ensureDir();
    const q = query.trim().toLowerCase();
    if (!q) return { items: [], scanned: 0, returned: 0 };

    let data = "";
    try {
      data = await fs.readFile(MEMORY_FILE, "utf-8");
    } catch {
      return { items: [], scanned: 0, returned: 0 };
    }

    const lines = data.split("\n").filter(Boolean);
    const out: MemoryRecord[] = [];
    let scanned = 0;

    for (let i = lines.length - 1; i >= 0; i--) {
      scanned++;
      try {
        const rec = JSON.parse(lines[i]) as MemoryRecord;
        if (String(rec.content || "").toLowerCase().includes(q)) out.push(rec);
      } catch {
        // Ignora líneas corruptas
      }
      if (out.length >= limit) break;
    }

    out.reverse();
    return { items: out, scanned, returned: out.length };
  }
}
