// src/ai/security/kairosPatchSig.ts
import crypto from "crypto";

const WINDOW_MS = 30_000;
const MAX_HEADER_LEN = 512;

// anti-replay simple en RAM
const used = new Map<string, number>(); // key -> expiresAt

function prune() {
  const now = Date.now();
  for (const [k, exp] of used.entries()) {
    if (exp <= now) used.delete(k);
  }
}

function stableStringify(x: any): string {
  if (x === null || typeof x !== "object") return JSON.stringify(x);
  if (Array.isArray(x)) return "[" + x.map(stableStringify).join(",") + "]";

  const keys = Object.keys(x).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify(x[k]))
      .join(",") +
    "}"
  );
}

function sha256Hex(text: string) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function hmacHex(secret: string, msg: string) {
  return crypto.createHmac("sha256", secret).update(msg, "utf8").digest("hex");
}

function timingEq(a: string, b: string) {
  const aa = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");

  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function sanitizeHeader(value: any): string {
  return String(value || "").trim();
}

function assertReasonableHeader(value: string, code: string) {
  if (!value || value.length > MAX_HEADER_LEN) {
    throw new Error(code);
  }
}

export function requireKairosPatchSig(req: any, res: any, next: any) {
  try {
    prune();

    const secret = sanitizeHeader(process.env.KAIROS_PATCH_SECRET);
    if (!secret) {
      return res
        .status(500)
        .json({ ok: false, error: "KAIROS_PATCH_SECRET_MISSING" });
    }

    const ts = sanitizeHeader(req.header("x-kairos-patch-ts"));
    const nonce = sanitizeHeader(req.header("x-kairos-patch-nonce"));
    const bodyH = sanitizeHeader(req.header("x-kairos-patch-body"));
    const sig = sanitizeHeader(req.header("x-kairos-patch-sig"));

    if (!ts || !nonce || !bodyH || !sig) {
      return res
        .status(403)
        .json({ ok: false, error: "PATCH_SIG_HEADERS_MISSING" });
    }

    assertReasonableHeader(ts, "PATCH_TS_BAD");
    assertReasonableHeader(nonce, "PATCH_NONCE_BAD");
    assertReasonableHeader(bodyH, "PATCH_BODY_HASH_BAD");
    assertReasonableHeader(sig, "PATCH_SIG_BAD");

    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum)) {
      return res.status(403).json({ ok: false, error: "PATCH_TS_BAD" });
    }

    const now = Date.now();
    if (Math.abs(now - tsNum) > WINDOW_MS) {
      return res.status(403).json({ ok: false, error: "PATCH_EXPIRED" });
    }

    const method = String(req.method || "").toUpperCase().trim();
    const requestPath = String(req.originalUrl || "").trim();

    if (!method || !requestPath) {
      return res.status(403).json({ ok: false, error: "PATCH_REQUEST_BAD" });
    }

    const replayKey = `${ts}.${nonce}.${method}.${requestPath}`;
    if (used.has(replayKey)) {
      return res.status(403).json({ ok: false, error: "PATCH_REPLAY" });
    }

    // body canonical
    const canon = stableStringify(req.body ?? {});
    const expectedBodyH = sha256Hex(canon);

    if (!timingEq(expectedBodyH, bodyH)) {
      return res.status(403).json({ ok: false, error: "PATCH_BODY_TAMPER" });
    }

    // signature
    const msg = `${ts}.${nonce}.${method}.${requestPath}.${bodyH}`;
    const expectedSig = hmacHex(secret, msg);

    if (!timingEq(expectedSig, sig)) {
      return res.status(403).json({ ok: false, error: "PATCH_SIG_BAD" });
    }

    // marcar replay solo después de validar todo
    used.set(replayKey, now + WINDOW_MS);

    next();
  } catch (e: any) {
    return res
      .status(403)
      .json({ ok: false, error: e?.message || "PATCH_SIG_FAIL" });
  }
}
