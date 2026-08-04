import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "ora-data");
const QUEUE_FILE = path.join(DATA_DIR, "auto-evolution-queue.json");

export type EvolutionQueueItem = {
  id: string;
  title: string;
  message: string;
  suggestedIntent: string;
  essence: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "converted" | "archived";
  createdAt: string;
  updatedAt: string;
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(QUEUE_FILE)) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify({ items: [] }, null, 2), "utf8");
  }
}

function readStore(): { items: EvolutionQueueItem[] } {
  ensureStore();
  try {
    const raw = fs.readFileSync(QUEUE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return { items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { items: [] };
  }
}

function writeStore(store: { items: EvolutionQueueItem[] }) {
  ensureStore();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function makeId() {
  return `obs-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function listEvolutionQueue() {
  return readStore().items;
}

export function addEvolutionSuggestion(input: {
  title: string;
  message: string;
  suggestedIntent: string;
  essence?: string;
  priority?: "low" | "medium" | "high";
}) {
  const store = readStore();
  const now = new Date().toISOString();

  const item: EvolutionQueueItem = {
    id: makeId(),
    title: input.title,
    message: input.message,
    suggestedIntent: input.suggestedIntent,
    essence: input.essence || "rafael",
    priority: input.priority || "medium",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  store.items.unshift(item);
  writeStore(store);

  return item;
}

export function updateEvolutionSuggestion(
  id: string,
  patch: Partial<EvolutionQueueItem>
) {
  const store = readStore();
  const index = store.items.findIndex((item) => item.id === id);

  if (index < 0) throw new Error("SUGGESTION_NOT_FOUND");

  store.items[index] = {
    ...store.items[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  writeStore(store);
  return store.items[index];
}
