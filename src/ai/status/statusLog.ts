// src/ai/status/statusLog.ts
import fs from "fs";
import path from "path";

export type StatusEvent = {
  ts: string;
  type: string;
  ok: boolean;
  ip?: string;
  route?: string;
  module?: string;
  meta?: Record<string, any>;
};

const LOG_DIR = path.resolve(process.cwd(), "data/logs");
const LOG_FILE = path.join(LOG_DIR, "events.jsonl");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logEvent(event: Omit<StatusEvent, "ts">) {
  ensureLogDir();
  const full: StatusEvent = { ts: new Date().toISOString(), ...event };
  fs.appendFileSync(LOG_FILE, JSON.stringify(full) + "\n", { encoding: "utf-8" });
}

export function readEvents(limit = 50): StatusEvent[] {
  ensureLogDir();
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs.readFileSync(LOG_FILE, "utf-8").trim().split("\n").filter(Boolean);

  return lines
    .slice(-limit)
    .map((l) => {
      try {
        return JSON.parse(l) as StatusEvent;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as StatusEvent[];
}
