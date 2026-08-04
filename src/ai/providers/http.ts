import fs from "fs/promises";
import path from "path";

const CHAT_FILE = path.join(process.cwd(), "data", "chat_history.jsonl");

export async function appendChat(entry: any) {
  const line = JSON.stringify(entry) + "\n";
  await fs.appendFile(CHAT_FILE, line, "utf8");
}

export async function readChatTail(limit: number = 50) {
  try {
    const data = await fs.readFile(CHAT_FILE, "utf8");
    const lines = data.trim().split("\n").filter(Boolean);
    return lines.slice(-limit).map(l => JSON.parse(l));
  } catch { return []; }
}

export async function clearChat() {
  try { await fs.unlink(CHAT_FILE); } catch {}
}
