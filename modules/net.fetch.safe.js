const { URL } = require("url");

function getEnvList(name) {
  return (process.env[name] || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

module.exports = async function (payload, ctx) {
  const urlStr = payload && payload.url;
  if (!urlStr) return { ok: false, error: "Falta payload.url" };

  const u = new URL(urlStr);
  if (u.protocol !== "https:") {
    return { ok: false, error: "Solo HTTPS permitido" };
  }

  const allowlist = getEnvList("NET_ALLOWLIST");
  if (!allowlist.includes(u.hostname)) {
    return {
      ok: false,
      error: `Dominio no permitido: ${u.hostname}`,
      allowed: allowlist
    };
  }

  const headers = Object.assign({
    "User-Agent": "ORA/0.1 (kairos; net.fetch.safe)",
    "Accept": "application/json, text/plain;q=0.9,*/*;q=0.8"
  }, payload.headers || {});

  const timeoutMs = Number(process.env.NET_TIMEOUT_MS || 8000);
  const maxBytes = Number(process.env.NET_MAX_BYTES || 500000);

  try {
    const res = await ctx.net.fetch({
      url: urlStr,
      method: payload.method || "GET",
      headers,
      timeoutMs,
      maxBytes
    });

    let data = res.body;
    try { data = JSON.parse(res.body); } catch (_) {}

    return {
      ok: true,
      status: res.status,
      data,
      host: u.hostname,
      fetchedAt: new Date().toISOString(),
      actorId: ctx.actorId
    };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
};
