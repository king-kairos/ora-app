const fs = require("fs");
const path = require("path");

module.exports = async function(payload, ctx){
  const p = payload && payload.path ? String(payload.path) : "";
  if (!p) return { ok:false, error:"Falta payload.path" };

  // Bloqueos fuertes
  if (p.includes("..") || p.includes("\\") || p.startsWith("/")) {
    return { ok:false, error:"Ruta invalida" };
  }

  // Solo permitimos leer dentro de ora_outputs
  const root = ctx.OUTPUTS_DIR; // /home/.../ora_outputs
  const full = path.join(root, p);
  const resolved = path.resolve(full);
  const resolvedRoot = path.resolve(root);

  if (!resolved.startsWith(resolvedRoot + path.sep) && resolved !== resolvedRoot) {
    return { ok:false, error:"Fuera de ora_outputs" };
  }

  if (!fs.existsSync(resolved)) return { ok:false, error:"No existe" };

  const st = fs.statSync(resolved);
  if (!st.isFile()) return { ok:false, error:"No es archivo" };

  const MAX = parseInt(process.env.READ_MAX_BYTES || "200000", 10);
  const size = st.size;
  const fd = fs.openSync(resolved, "r");
  try {
    const toRead = Math.min(size, MAX);
    const buf = Buffer.alloc(toRead);
    fs.readSync(fd, buf, 0, toRead, 0);
    const text = buf.toString("utf8");
    return {
      ok:true,
      path: p,
      bytes: toRead,
      fileBytes: size,
      truncated: size > MAX,
      content: text
    };
  } finally {
    fs.closeSync(fd);
  }
};
