import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "security");

const eventsFile = path.join(DATA_DIR, "events.json");
const alertsFile = path.join(DATA_DIR, "alerts.json");
const camerasFile = path.join(DATA_DIR, "cameras.json");

function ensureFile(file: string) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]");
  }
}

export function readEvents() {
  ensureFile(eventsFile);

  try {
    return JSON.parse(fs.readFileSync(eventsFile, "utf-8"));
  } catch {
    return [];
  }
}

export function writeEvents(data: any[]) {
  ensureFile(eventsFile);
  fs.writeFileSync(eventsFile, JSON.stringify(data, null, 2));
}

export function readAlerts() {
  ensureFile(alertsFile);

  try {
    return JSON.parse(fs.readFileSync(alertsFile, "utf-8"));
  } catch {
    return [];
  }
}

export function writeAlerts(data: any[]) {
  ensureFile(alertsFile);
  fs.writeFileSync(alertsFile, JSON.stringify(data, null, 2));
}

export function readCameras() {
  ensureFile(camerasFile);

  try {
    return JSON.parse(fs.readFileSync(camerasFile, "utf-8"));
  } catch {
    return [];
  }
}

export function writeCameras(data: any[]) {
  ensureFile(camerasFile);
  fs.writeFileSync(camerasFile, JSON.stringify(data, null, 2));
}
