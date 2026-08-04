const fs = require("fs");
const path = require("path");

const MEMORY_FILE = path.join(process.cwd(), "ora-data", "evolution-memory.json");

function loadMemory() {
  if (!fs.existsSync(MEMORY_FILE)) {
    return { history: [] };
  }

  try {
    const raw = fs.readFileSync(MEMORY_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { history: [] };
  }
}

function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

function recordEvent(event) {
  const memory = loadMemory();

  memory.history.push({
    timestamp: new Date().toISOString(),
    ...event
  });

  if (memory.history.length > 1000) {
    memory.history.shift();
  }

  saveMemory(memory);
}

module.exports = {
  loadMemory,
  recordEvent
};
