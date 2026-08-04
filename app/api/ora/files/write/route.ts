import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function safeResolve(inputPath: string) {
  const resolved = path.resolve(ROOT, inputPath);
  if (!resolved.startsWith(ROOT)) throw new Error("INVALID_PATH");
  return resolved;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const file = String(body?.file || "").trim();
    const content = String(body?.content ?? "");
    const overwrite = body?.overwrite !== false;

    if (!file) {
      return NextResponse.json({ ok: false, error: "FILE_REQUIRED" }, { status: 400 });
    }

    const resolved = safeResolve(file);
    const dir = path.dirname(resolved);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(resolved) && !overwrite) {
      return NextResponse.json({ ok: false, error: "FILE_EXISTS" }, { status: 409 });
    }

    let backup: string | null = null;

    if (fs.existsSync(resolved)) {
      const backupDir = path.resolve(ROOT, "ora-data/backups/files-write");
      fs.mkdirSync(backupDir, { recursive: true });

      backup = path.join(
        backupDir,
        file.replace(/[\/\\]/g, "__") + "." + Date.now() + ".bak"
      );

      fs.copyFileSync(resolved, backup);
    }

    fs.writeFileSync(resolved, content, "utf8");

    return NextResponse.json({
      ok: true,
      file,
      bytes: Buffer.byteLength(content, "utf8"),
      backup: backup ? path.relative(ROOT, backup) : null,
      message: "Archivo escrito correctamente.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "WRITE_FAILED" },
      { status: 500 }
    );
  }
}
