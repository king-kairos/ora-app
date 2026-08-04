// src/ai/security/kairosPatchSig.js
import crypto from "crypto";

const WINDOW_MS = 30_000;
const used = new Map();

function prune() {
  const now = Date.now();
  for (const [k, exp] of used.entries()) if (exp <= now) used.delete(k);
}

function stableStringify(x) {
  if (x === null || typeof x !== "object") return JSON.stringify(x);
  if (Array.isArray(x)) return "[" + x.map(stableStringify).join(",") + "]";
  const keys = Object.keys(x).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(x[k])).join(",") + "}";
}

function sha256Hex(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function hmacHex(secret, msg) {
  return crypto.createHmac("sha256", secret).update(msg, "utf8").digest("hex");
}

function timingEq(a, b) {
  const aa = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function requireKairosPatchSig(req, res, next) {
  try {
    prune();

    const secret = String(process.env.KAIROS_PATCH_SECRET || "").trim();
    if (!secret) return res.status(500).json({ ok: false, error: "KAIROS_PATCH_SECRET_MISSING" });

    const ts = String(req.header("x-kairos-patch-ts") || "").trim();
    const nonce = String(req.header("x-kairos-patch-nonce") || "").trim();
    const bodyH = String(req.header("x-kairos-patch-body") || "").trim();
    const sig = String(req.header("x-kairos-patch-sig") || "").trim();

    if (!ts || !nonce || !bodyH || !sig) {
      return res.status(403).json({ ok: false, error: "PATCH_SIG_HEADERS_MISSING" });
    }

    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum)) return res.status(403).json({ ok: false, error: "PATCH_TS_BAD" });

    const now = Date.now();
    if (Math.abs(now - tsNum) > WINDOW_MS) return res.status(403).json({ ok: false, error: "PATCH_EXPIRED" });

    const replayKey = `${ts}.${nonce}.${String(req.method || "").toUpperCase()}.${req.originalUrl}`;
    if (used.has(replayKey)) return res.status(403).json({ ok: false, error: "PATCH_REPLAY" });
    used.set(replayKey, now + WINDOW_MS);

    // Canon estable del body (independiente del orden de keys)
    const canon = stableStringify(req.body ?? {});
    const expectedBodyH = sha256Hex(canon);
    if (!timingEq(expectedBodyH, bodyH)) return res.status(403).json({ ok: false, error: "PATCH_BODY_TAMPER" });

    const path = req.originalUrl;
    const msg = `${ts}.${nonce}.${String(req.method || "").toUpperCase()}.${path}.${bodyH}`;
    const expectedSig = hmacHex(secret, msg);

    if (!timingEq(expectedSig, sig)) return res.status(403).json({ ok: false, error: "PATCH_SIG_BAD" });

    next();
  } catch (e) {
    return res.status(403).json({ ok: false, error: (e && e.message) || "PATCH_SIG_FAIL" });
  }
}
