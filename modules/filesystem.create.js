// modules/filesystem.create.js
// Crea un archivo dentro de ora_outputs (efecto físico controlado)

const fs = require("fs");
const path = require("path");

module.exports = async function filesystemCreate(payload, ctx) {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload inválido (debe ser objeto)");
  }

  const name = payload.name;
  const content = payload.content;

  if (!name || typeof name !== "string") {
    throw new Error("payload.name requerido (string)");
  }
  if (typeof content !== "string") {
    throw new Error("payload.content requerido (string)");
  }

  // Seguridad básica: no permitimos rutas
  if (name.includes("/") || name.includes("\\") || name.includes("..")) {
    throw new Error("Nombre de archivo no permitido");
  }

  const outPath = path.join(ctx.OUTPUTS_DIR, name);

  fs.writeFileSync(outPath, content, "utf8");

  return {
    ok: true,
    wrote: outPath,
    bytes: Buffer.byteLength(content, "utf8"),
  };
};
