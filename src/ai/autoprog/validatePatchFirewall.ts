import path from "path";

export type PatchFile = {
  path: string;
  content?: string | null;
  delete?: boolean;
};

export type Patch = {
  title?: string;
  files?: PatchFile[];
  meta?: any;
};

const MAX_FILES = 25;
const MAX_FILE_BYTES = 100_000;     // 100 KB por archivo
const MAX_TOTAL_BYTES = 300_000;    // 300 KB por patch

// 🔥 Archivos prohibidos SIEMPRE
const DENY_EXACT = new Set([
  ".env",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "tsconfig.json"
]);

// 🔥 Prefijos prohibidos
const DENY_PREFIX = [
  ".git/",
  "node_modules/",
  "keys/",
  "certs/",
  "secrets/"
];

// 🔒 Núcleo sensible (clones NO pueden tocar)
const CORE_PREFIX = [
  "src/server/",
  "src/core/",
  "src/ai/autoprog/"
];

// ✅ Zonas permitidas generales
const ALLOW_PREFIX = [
  "src/app/",
  "src/ai/modules/",
  "src/lib/",
  "public/",
  "data/"
];

// ----------------------------------
// Utilidades
// ----------------------------------

function normalizeSafe(p: string): string {
  const cleaned = String(p || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  // Normalizar con raíz artificial
  const resolved = path.posix.normalize("/" + cleaned).slice(1);

  if (
    !resolved ||
    resolved.startsWith("..") ||
    resolved.includes("/..") ||
    resolved.includes("../")
  ) {
    throw new Error("INTENTO_DE_ESCAPE_DETECTADO");
  }

  return resolved;
}

function byteSize(str: string) {
  return Buffer.byteLength(str, "utf8");
}

function isClone(actor: string) {
  return actor.startsWith("clone:");
}

function cloneTerritory(actor: string) {
  const name = actor.replace("clone:", "").trim();
  return `src/app/clones/${name}/`;
}

function isAllowedBase(fp: string) {
  if (DENY_EXACT.has(fp)) return false;
  if (DENY_PREFIX.some(pre => fp.startsWith(pre))) return false;
  return ALLOW_PREFIX.some(pre => fp.startsWith(pre));
}

// ----------------------------------
// FIREWALL PRINCIPAL
// ----------------------------------

/**
 * actor ejemplos:
 *  - "kairos"
 *  - "rama:kaerliana"
 *  - "clone:lottery"
 */
export function validatePatchFirewall(
  patch: Patch,
  actor: string = "kairos"
) {
  if (!patch || typeof patch !== "object") {
    throw new Error("PATCH_INVALID_STRUCTURE");
  }

  const files = patch.files || [];

  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("PATCH_NO_FILES");
  }

  if (files.length > MAX_FILES) {
    throw new Error("PATCH_TOO_MANY_FILES");
  }

  let totalBytes = 0;

  for (const file of files) {
    if (!file || typeof file.path !== "string") {
      throw new Error("PATCH_FILE_BAD_PATH");
    }

    const fp = normalizeSafe(file.path);

    // 🔥 Bloqueos universales
    if (DENY_EXACT.has(fp)) {
      throw new Error(`ACCESO_DENEGADO: ${fp}`);
    }

    if (DENY_PREFIX.some(pre => fp.startsWith(pre))) {
      throw new Error(`ACCESO_DENEGADO: ${fp}`);
    }

    // ----------------------------
    // CLONES
    // ----------------------------
    if (isClone(actor)) {
      if (CORE_PREFIX.some(pre => fp.startsWith(pre))) {
        throw new Error(`NUCLEO_BLOQUEADO_PARA_CLON: ${fp}`);
      }

      const territory = cloneTerritory(actor);

      if (!fp.startsWith(territory)) {
        throw new Error(`FUERA_DE_TERRITORIO_DE_CLON: ${fp}`);
      }

      if (!isAllowedBase(fp)) {
        throw new Error(`RUTA_FUERA_DE_ALLOWLIST: ${fp}`);
      }
    }
    // ----------------------------
    // RAMAS + KAIROS
    // ----------------------------
    else {
      if (!isAllowedBase(fp)) {
        throw new Error(`RUTA_FUERA_DE_JURISDICCION: ${fp}`);
      }
    }

    // ----------------------------
    // Validación de tamaño
    // ----------------------------
    if (!file.delete) {
      const content = file.content ?? "";
      if (typeof content !== "string") {
        throw new Error(`PATCH_CONTENT_INVALIDO: ${fp}`);
      }

      const size = byteSize(content);

      if (size > MAX_FILE_BYTES) {
        throw new Error(`ARCHIVO_DEMASIADO_GRANDE: ${fp}`);
      }

      totalBytes += size;

      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new Error("PATCH_TOTAL_EXCEDIDO");
      }
    }
  }

  return {
    ok: true,
    actor,
    files: files.length,
    totalBytes
  };
}
