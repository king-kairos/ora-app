import fs from "fs";
import path from "path";
import { SecurityEvent } from "./eventMemory";
import { SecurityAlert } from "./alertMemory";

const DATA_DIR = path.join(process.cwd(), "ora-data", "security");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function saveEvents(events: SecurityEvent[]) {
  ensureDir();
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

export function loadEvents(): SecurityEvent[] {
  ensureDir();
  if (!fs.existsSync(EVENTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
}

export function saveAlerts(alerts: SecurityAlert[]) {
  ensureDir();
  fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
}

export function loadAlerts(): SecurityAlert[] {
  ensureDir();
  if (!fs.existsSync(ALERTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(ALERTS_FILE, "utf8"));
}
