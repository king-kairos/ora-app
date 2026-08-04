export const runtime = "nodejs";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function GET(req: Request) {
  const traceId = `DL-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
  const file = new URL(req.url).searchParams.get("file");
  if (req.headers.get("x-kairos-seal") !== process.env.KAIROS_SEAL) return NextResponse.json({ ok: false, error: "No autorizado", traceId }, { status: 403 });
  if (!file || !/^[a-zA-Z0-9._-]+$/.test(file)) return NextResponse.json({ ok: false, error: "Nombre inválido", traceId }, { status: 400 });
  try {
    const buffer = await fs.readFile(path.join(process.cwd(), "data/uploads", file));
    return new NextResponse(buffer, { headers: { "Content-Disposition": `attachment; filename="${file}"`, "Content-Type": "application/octet-stream", "X-ORA-TRACE": traceId } });
  } catch { return NextResponse.json({ ok: false, error: "No encontrado", traceId }, { status: 404 }); }
}
