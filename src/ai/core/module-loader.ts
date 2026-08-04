import fs from "fs";
import path from "path";

const REGISTRY = path.join(process.cwd(), "ora-data/module-registry.json");

export function loadModules() {
  try {
    if (!fs.existsSync(REGISTRY)) return [];

    const data = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));

    return data.map((m: any) => ({
      name: m.moduleName,
      title: m.title,
      branch: m.branch,
      status: m.status,
      source: m.source
    }));
  } catch {
    return [];
  }
}
