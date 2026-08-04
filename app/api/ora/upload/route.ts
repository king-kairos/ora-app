export const runtime = "nodejs";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(req: Request) {
  const traceId = `UP-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
  const uploadDir = path.join(process.cwd(), "data/uploads");
  if (req.headers.get("x-kairos-seal") !== process.env.KAIROS_SEAL) return NextResponse.json({ ok: false, error: "No autorizado", traceId }, { status: 403 });
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file || typeof file === "string") return NextResponse.json({ ok: false, error: "Vacío", traceId }, { status: 400 });
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, safeName), Buffer.from(await file.arrayBuffer()));
    await fs.appendFile(path.join(process.cwd(), "data/history.jsonl"), JSON.stringify({ traceId, timestamp: new Date().toISOString(), action: "upload", original: file.name, vault: safeName, ok: true }) + "\n");
    return NextResponse.json({ ok: true, text: `OK: ${file.name}`, traceId });
  } catch { return NextResponse.json({ ok: false, error: "Error", traceId }, { status: 500 }); }
}
