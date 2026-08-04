// src/ai/memory/sqliteMemoryStore.ts
import fs from "fs/promises";
import path from "path";

type Msg = { role: string; content: string; module: string; ts: number };

export class SQLiteMemoryStore {
  private root = path.join(process.cwd(), "data", "memory");

  private async fileFor(module: string) {
    await fs.mkdir(this.root, { recursive: true }).catch(() => {});
    return path.join(this.root, `${module}.jsonl`);
  }

  async save(msg: Msg) {
    const file = await this.fileFor(msg.module);
    await fs.appendFile(file, JSON.stringify(msg) + "\n", "utf8");
    return true;
  }

  async list(module: string, limit = 120) {
    const file = await this.fileFor(module);
    try {
      const raw = await fs.readFile(file, "utf8");
      const lines = raw.split("\n").filter(Boolean);
      const items = lines.map((ln) => {
        try { return JSON.parse(ln); } catch { return null; }
      }).filter(Boolean);
      return items.slice(Math.max(0, items.length - limit));
    } catch {
      return [];
    }
  }
}
