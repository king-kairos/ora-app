export const runtime = "nodejs";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { appendLog } from "@/lib/ora/log";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB para análisis (rápido y seguro)
const SAFE_NAME = /^[a-zA-Z0-9._-]{1,200}$/;

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sniffMime(name: string, sample: Buffer) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return "text/plain";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".pdf")) return "application/pdf";
  // fallback: si parece texto (muchos chars imprimibles), lo marcamos text/plain
  const s = sample.toString("utf8");
  const printable = s.replace(/[\x09\x0A\x0D\x20-\x7E]/g, "");
  if (printable.length <= Math.max(10, s.length * 0.02)) return "text/plain";
  return "application/octet-stream";
}

function extractSignals(text: string) {
  const urls = Array.from(text.matchAll(/https?:\/\/[^\s"'<>]+/g)).map(m => m[0]).slice(0, 50);
  const emails = Array.from(text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)).map(m => m[0]).slice(0, 50);

  const hasPrivateKey = /BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY/.test(text);
  const hasJwtLike = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/.test(text);
  const hasAwsKey = /\bAKIA[0-9A-Z]{16}\b/.test(text);
  const hasOpenAIKey = /\bsk-[A-Za-z0-9]{20,}\b/.test(text);

  const codeBlocks = (text.match(/```/g) || []).length / 2;

  return {
    urls,
    emails,
    flags: {
      hasPrivateKey,
      hasJwtLike,
      hasAwsKey,
      hasOpenAIKey,
      manyCodeBlocks: codeBlocks >= 2,
    }
  };
}

export async function GET(req: Request) {
  const traceId = `KAE-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
  const seal = req.headers.get("x-kairos-seal") || "";

  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0]?.trim() || "local";
  const ua = req.headers.get("user-agent") || "unknown";

  if (seal !== process.env.KAIROS_SEAL) {
    await appendLog({ traceId, timestamp: new Date().toISOString(), ok: false, reason: "forbidden_access", detail: "invalid_seal", ip, ua });
    return NextResponse.json({ ok: false, error: "No autorizado", traceId }, { status: 403 });
  }

  const file = new URL(req.url).searchParams.get("file") || "";
  if (!file || !SAFE_NAME.test(file)) {
    await appendLog({ traceId, timestamp: new Date().toISOString(), ok: false, reason: "invalid_filename", file, ip, ua });
    return NextResponse.json({ ok: false, error: "Nombre inválido", traceId }, { status: 400 });
  }

  try {
    const base = path.resolve(process.cwd(), "data", "uploads");
    const full = path.resolve(base, file);
    if (!full.startsWith(base + path.sep)) {
      await appendLog({ traceId, timestamp: new Date().toISOString(), ok: false, reason: "anti_traversal", file, ip, ua });
      return NextResponse.json({ ok: false, error: "Prohibido", traceId }, { status: 400 });
    }

    const st = await fs.stat(full);
    const tooBig = st.size > MAX_BYTES;

    // Leer solo hasta MAX_BYTES (si es gigante, no lo procesamos completo)
    const buf = await fs.readFile(full).then(b => (tooBig ? b.subarray(0, MAX_BYTES) : b));
    const hash = sha256(buf);
    const mime = sniffMime(file, buf.subarray(0, 256));

    let preview = "";
    let signals: any = { urls: [], emails: [], flags: {} };

    if (mime.startsWith("text/") || mime === "application/json") {
      const text = buf.toString("utf8");
      preview = text.slice(0, 4000); // preview 4k
      signals = extractSignals(text);
    } else {
      preview = "(archivo binario: preview no disponible)";
    }

    await appendLog({
      traceId,
      timestamp: new Date().toISOString(),
      ok: true,
      module: "kaerliana",
      action: "analyze",
      file,
      bytes: st.size,
      analyzedBytes: buf.length,
      ip,
      ua
    });

    return NextResponse.json({
      ok: true,
      traceId,
      file,
      meta: { bytes: st.size, analyzedBytes: buf.length, mime, sha256: hash, truncated: tooBig },
      signals,
      preview
    });
  } catch {
    await appendLog({ traceId, timestamp: new Date().toISOString(), ok: false, reason: "not_found", file, ip, ua });
    return NextResponse.json({ ok: false, error: "No encontrado", traceId }, { status: 404 });
  }
}
