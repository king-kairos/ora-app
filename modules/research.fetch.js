const fs = require("fs");
const path = require("path");

function safeName(s){
  return String(s||"")
    .replace(/^https?:\/\//,"http_")
    .replace(/[^a-zA-Z0-9._-]+/g,"_")
    .slice(0,120) || "url";
}

module.exports = async function(payload, ctx){
  const url = payload && payload.url ? String(payload.url) : "";
  if(!url) return { ok:false, error:"url requerida" };

  // Seguridad base: solo http/https
  if(!/^https?:\/\//i.test(url)) return { ok:false, error:"solo http/https" };

  const ua = (process.env.ORA_USER_AGENT || "ORA-Kairos/1.0 (+https://ora.local)");

  // net.fetch.safe debe existir
  if (!ctx || !ctx.net || !ctx.net.fetch || !ctx.net.fetch.safe) {
  return { ok: false, error: "ctx.net.fetch.safe no disponible" };
}

const res = await ctx.net.fetch.safe({
  url,
  method: "GET",
  headers: { "User-Agent": ua }
  timeoutMs: 15000,
  maxBytes: 500000
});

  // Guardado controlado dentro de ora_outputs/research
  const root = ctx.OUTPUTS_DIR;
  const dir = path.join(root, "research");
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });

  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  const fname = stamp + "__" + safeName(url) + ".json";
  const full = path.join(dir, fname);

  const out = {
    ok: true,
    url,
    fetchedAt: new Date().toISOString(),
    status: res && res.status,
    bytes: res && res.bytes,
    data: res && res.data
  };

  fs.writeFileSync(full, JSON.stringify(out, null, 2), "utf8");

  const preview = JSON.stringify(out.data).slice(0, 400);
  return { ok:true, savedPath: path.relative(root, full), status: out.status, bytes: out.bytes, preview };
};
