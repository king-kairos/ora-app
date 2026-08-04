// modules/code.write.js
// Crea/actualiza archivos dentro de /modules (auto-programación controlada)

const fs = require("fs");
const path = require("path");

function isSafeModuleName(name) {
  // permite: letras, numeros, punto, guion y underscore
  // ej: "tools.echo", "filesystem.append", "agent.v1"
  return typeof name === "string" && /^[a-zA-Z0-9._-]+$/.test(name);
}

module.exports = async function codeWrite(payload, ctx) {
  const { MODULES_DIR, actorId } = ctx;

  if (!payload || typeof payload !== "object") {
    throw new Error("payload inválido");
  }

  const name = payload.name; // nombre del módulo sin ".js" o con ".js"
  const content = payload.content; // contenido del archivo JS
  const overwrite = payload.overwrite === true; // por defecto false
  const dryRun = payload.dryRun === true; // si true, no escribe

  if (!isSafeModuleName(name)) {
    throw new Error("Nombre de módulo inválido. Usa solo letras/números/._-");
  }

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("content inválido o vacío");
  }

  // límite para evitar escribir cosas gigantes
  if (content.length > 40_000) {
    throw new Error("content demasiado grande (max 40,000 chars)");
  }

  const fileName = name.endsWith(".js") ? name : `${name}.js`;

  // ruta final SIEMPRE dentro de MODULES_DIR
  const outPath = path.join(MODULES_DIR, fileName);

  // seguridad extra: asegurar que no se salga del directorio modules
  const resolved = path.resolve(outPath);
  const resolvedBase = path.resolve(MODULES_DIR);
  if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
    throw new Error("Ruta bloqueada (fuera de /modules)");
  }

  if (fs.existsSync(outPath) && !overwrite) {
    throw new Error("El módulo ya existe. Usa overwrite:true si quieres reemplazarlo.");
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      wrote: outPath,
      bytes: Buffer.byteLength(content, "utf8"),
      actorId,
    };
  }

  fs.writeFileSync(outPath, content, "utf8");

  return {
    ok: true,
    wrote: outPath,
    bytes: Buffer.byteLength(content, "utf8"),
    actorId,
  };
};
