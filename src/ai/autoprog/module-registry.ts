import fs from "fs";
import path from "path";

export type RegisteredModule = {
  id: string;
  moduleName: string;
  title: string;
  description: string;
  branch: string;
  source: "intent-engine" | "module-generator" | "manual";
  createdAt: string;
  status: "active";
};

function registryPath() {
  return path.join(process.cwd(), "ora-data", "module-registry.json");
}

function ensureRegistryFile() {
  const filePath = registryPath();
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), "utf8");
  }
}

export function readModuleRegistry(): RegisteredModule[] {
  ensureRegistryFile();

  try {
    const raw = fs.readFileSync(registryPath(), "utf8");
    const data = JSON.parse(raw);

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function writeModuleRegistry(items: RegisteredModule[]) {
  ensureRegistryFile();
  fs.writeFileSync(registryPath(), JSON.stringify(items, null, 2), "utf8");
}

export function registerModule(
  input: Omit<RegisteredModule, "id" | "createdAt" | "status">
) {
  const items = readModuleRegistry();

  const existing = items.find((item) => item.moduleName === input.moduleName);
  if (existing) {
    return {
      ok: true,
      created: false,
      item: existing,
      message: `El módulo ${input.moduleName} ya estaba registrado.`,
    };
  }

  const item: RegisteredModule = {
    id: `module_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: "active",
    ...input,
  };

  items.unshift(item);
  writeModuleRegistry(items);

  return {
    ok: true,
    created: true,
    item,
    message: `Módulo ${input.moduleName} registrado correctamente.`,
  };
}
