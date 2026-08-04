// src/ai/memory/sqliteMemoryStore.js
// ORA SOBERANA - Memoria por módulo en SQLite (un solo archivo: data/ora.db)

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "ora.db");

function ensureDataDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}

export class SQLiteMemoryStore {
  constructor() {
    ensureDataDir();
    this.db = new Database(DB_FILE);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this._migrate();
  }

  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        module TEXT NOT NULL,
        provider TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        meta TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_messages_module_ts
      ON messages(module, ts);

      CREATE INDEX IF NOT EXISTS idx_messages_role_ts
      ON messages(role, ts);
    `);

    this._ins = this.db.prepare(`
      INSERT INTO messages (ts, module, provider, role, content, meta)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    this._list = this.db.prepare(`
      SELECT id, ts, module, provider, role, content, meta
      FROM messages
      WHERE module = ?
      ORDER BY id DESC
      LIMIT ?
    `);

    this._listAll = this.db.prepare(`
      SELECT id, ts, module, provider, role, content, meta
      FROM messages
      ORDER BY id DESC
      LIMIT ?
    `);
  }

  async save({ role = "ora", content = "", module = "kaerliana", provider = "", meta = null }) {
    const ts = new Date().toISOString();
    const safeContent = String(content ?? "");
    const safeModule = String(module ?? "kaerliana");
    const safeRole = String(role ?? "ora");
    const safeProvider = String(provider ?? "");
    const metaStr = meta == null ? null : JSON.stringify(meta);

    this._ins.run(ts, safeModule, safeProvider, safeRole, safeContent, metaStr);
    return { ok: true };
  }

  // lista por módulo
  async list(module = "kaerliana", limit = 200) {
    const lim = Number.isFinite(limit) ? Math.max(1, Math.min(2000, limit)) : 200;
    return this._list.all(String(module ?? "kaerliana"), lim).reverse();
  }

  // lista global (si alguna vez la quieres)
  async listAll(limit = 200) {
    const lim = Number.isFinite(limit) ? Math.max(1, Math.min(2000, limit)) : 200;
    return this._listAll.all(lim).reverse();
  }
}
