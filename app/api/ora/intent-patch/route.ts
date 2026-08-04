import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function safeResolve(inputPath: string) {
  const resolved = path.resolve(ROOT, inputPath);
  if (!resolved.startsWith(ROOT)) throw new Error("INVALID_PATH");
  return resolved;
}

function backupPath(file: string) {
  const safe = file.replace(/[\/\\]/g, "__");
  return path.join(ROOT, "ora-data", "backups", "intent-patch", `${safe}.${Date.now()}.bak`);
}

export async function POST(req: NextRequest) {
  try {
    const seal = req.headers.get("x-kairos-seal") || "";
    if (seal !== process.env.KAIROS_SEAL) {
      return NextResponse.json({ ok: false, error: "INVALID_SEAL" }, { status: 401 });
    }

    const body = await req.json();

    const file = String(body?.file || "").trim();
    const find = String(body?.find || "");
    const replace = String(body?.replace || "");
    const apply = Boolean(body?.apply);

    if (!file) return NextResponse.json({ ok: false, error: "MISSING_FILE" }, { status: 400 });
    if (!find) return NextResponse.json({ ok: false, error: "MISSING_FIND" }, { status: 400 });

    const resolved = safeResolve(file);

    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ ok: false, error: "FILE_NOT_FOUND", file }, { status: 404 });
    }

    const before = fs.readFileSync(resolved, "utf8");

    if (!before.includes(find)) {
      return NextResponse.json({
        ok: false,
        error: "TEXT_NOT_FOUND",
        file,
        find,
      }, { status: 404 });
    }

    const after = before.replace(find, replace);
    const changed = before !== after;

    let backup: string | null = null;

    if (apply && changed) {
      const b = backupPath(file);
      fs.mkdirSync(path.dirname(b), { recursive: true });
      fs.writeFileSync(b, before, "utf8");
      fs.writeFileSync(resolved, after, "utf8");
      backup = path.relative(ROOT, b);
    }

    return NextResponse.json({
      ok: true,
      engine: "INTENT_PATCH_ENGINE_V1",
      file,
      changed,
      applied: apply && changed,
      backup,
      preview: {
        before: find,
        after: replace,
      },
      message: apply ? "Intent patch aplicado." : "Intent patch preview generado.",
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e?.message || "INTENT_PATCH_ERROR",
    }, { status: 500 });
  }
}
