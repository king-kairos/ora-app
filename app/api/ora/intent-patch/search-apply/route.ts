import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function safeResolve(inputPath: string) {
  const resolved = path.resolve(ROOT, inputPath);
  if (!resolved.startsWith(ROOT)) throw new Error("INVALID_PATH");
  return resolved;
}

function walk(dir: string, files: string[] = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    if (
      item === "node_modules" ||
      item === ".next" ||
      item === ".git" ||
      item === "ora-data/backups"
    ) continue;

    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) walk(full, files);
    else files.push(full);
  }

  return files;
}

function backupPath(file: string) {
  const safe = file.replace(/[\/\\]/g, "__");
  return path.join(ROOT, "ora-data", "backups", "search-intent-patch", `${safe}.${Date.now()}.bak`);
}

export async function POST(req: NextRequest) {
  try {
    const seal = req.headers.get("x-kairos-seal") || "";
    if (seal !== process.env.KAIROS_SEAL) {
      return NextResponse.json({ ok: false, error: "INVALID_SEAL" }, { status: 401 });
    }

    const body = await req.json();

    const query = String(body?.query || "").trim();
    const replace = String(body?.replace || "");
    const dir = String(body?.dir || "app").trim();
    const apply = Boolean(body?.apply);

    if (!query) return NextResponse.json({ ok: false, error: "MISSING_QUERY" }, { status: 400 });
    if (!replace) return NextResponse.json({ ok: false, error: "MISSING_REPLACE" }, { status: 400 });

    const baseDir = safeResolve(dir);

    if (!fs.existsSync(baseDir) || !fs.statSync(baseDir).isDirectory()) {
      return NextResponse.json({ ok: false, error: "DIR_NOT_FOUND", dir }, { status: 404 });
    }

    const allFiles = walk(baseDir).filter((f) =>
      /\.(ts|tsx|js|jsx|json|md|txt)$/.test(f)
    );

    const matches: any[] = [];

    for (const full of allFiles) {
      const content = fs.readFileSync(full, "utf8");
      if (!content.includes(query)) continue;

      const relative = path.relative(ROOT, full);
      const before = content;
      const after = before.replace(query, replace);
      const changed = before !== after;

      let backup: string | null = null;

      if (apply && changed) {
        const b = backupPath(relative);
        fs.mkdirSync(path.dirname(b), { recursive: true });
        fs.writeFileSync(b, before, "utf8");
        fs.writeFileSync(full, after, "utf8");
        backup = path.relative(ROOT, b);
      }

      matches.push({
        file: relative,
        changed,
        applied: apply && changed,
        backup,
        preview: {
          before: query,
          after: replace,
        },
      });

      break;
    }

    if (matches.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "TEXT_NOT_FOUND",
        query,
        dir,
      }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      engine: "SEARCH_INTENT_PATCH_ENGINE_V1",
      query,
      replace,
      dir,
      apply,
      matches,
      message: apply ? "Search intent patch aplicado." : "Search intent patch preview generado.",
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e?.message || "SEARCH_INTENT_PATCH_ERROR",
    }, { status: 500 });
  }
}
