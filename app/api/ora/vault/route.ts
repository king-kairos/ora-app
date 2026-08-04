export const runtime = "nodejs";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function GET(req: Request) {
  const traceId = `VLT-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
  if (req.headers.get("x-kairos-seal") !== process.env.KAIROS_SEAL) {
    return NextResponse.json({ ok: false, error: "No autorizado", traceId }, { status: 403 });
  }
  try {
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    const files = await fs.readdir(uploadDir);
    const cleanFiles = files.filter(f => !f.startsWith("."));
    return NextResponse.json({ ok: true, files: cleanFiles, traceId });
  } catch {
    return NextResponse.json({ ok: false, error: "Error en bóveda", traceId }, { status: 500 });
  }
}
