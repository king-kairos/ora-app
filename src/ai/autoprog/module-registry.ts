import fs from "fs";
import path from "path";

export type RegisteredModule = {
  id: string;
  moduleName: string;
  title: string;
  description: string;
  branch: string;
  source:
    | "intent-engine"
    | "module-generator"
    | "manual";
  createdAt: string;
  status: "active";
};

function registryPath() {
  return path.join(
    process.cwd(),
    "ora-data",
    "module-registry.json"
  );
}

/**
 * Lectura pura.
 *
 * Consultar el registry nunca debe crear
 * carpetas ni archivos.
 */
export function readModuleRegistry():
  RegisteredModule[] {
  const filePath = registryPath();

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw =
      fs.readFileSync(
        filePath,
        "utf8"
      );

    const data =
      JSON.parse(raw);

    return Array.isArray(data)
      ? data
      : [];
  } catch {
    return [];
  }
}

/**
 * MUTACIÓN LEGACY RETIRADA.
 *
 * El registro real debe integrarse después
 * de un Apply autorizado por la Puerta Kairos.
 */
export function writeModuleRegistry(
  _items: RegisteredModule[]
) {
  throw new Error(
    "DIRECT_MODULE_REGISTRY_MUTATION_RETIRED"
  );
}

/**
 * MUTACIÓN LEGACY RETIRADA.
 *
 * Pensar/proponer un módulo no puede
 * declararlo activo en el registry.
 */
export function registerModule(
  input: Omit<
    RegisteredModule,
    "id" | "createdAt" | "status"
  >
) {
  return {
    ok: true,
    created: false,
    pending: true,
    registered: false,
    item: {
      ...input,
      status: "active" as const,
    },
    message:
      `Registro de ${input.moduleName} pendiente de Apply soberano.`,
  };
}
