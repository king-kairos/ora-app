// src/ai/memory/chatStore.ts
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const CHAT_FILE = path.join(DATA_DIR, "chat_history.jsonl");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export type ChatEntry = {
  ts?: string;
  role: "user" | "ora";
  module?: string;
  provider?: string;
  text: string;
};

export async function appendChat(entry: ChatEntry) {
  await ensureDataDir();
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
  await fs.appendFile(CHAT_FILE, line, "utf8");
}

export async function readChatTail(limit: number = 50): Promise<ChatEntry[]> {
  try {
    const data = await fs.readFile(CHAT_FILE, "utf8");
    const lines = data.trim().split("\n").filter(Boolean);
    return lines.slice(-limit).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

export async function clearChat() {
  try {
    await fs.unlink(CHAT_FILE);
  } catch {
    // ignore
  }
}
