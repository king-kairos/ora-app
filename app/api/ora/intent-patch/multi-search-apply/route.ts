import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function safeResolve(target: string) {
  const resolved = path.resolve(ROOT, target);

  if (!resolved.startsWith(ROOT)) {
    throw new Error("Ruta inválida.");
  }

  return resolved;
}

function walk(dir: string, out: string[] = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      if (
        item === "node_modules" ||
        item === ".next" ||
        item === ".git"
      ) {
        continue;
      }

      walk(full, out);
    } else {
      out.push(full);
    }
  }

  return out;
}

export async function POST(req: NextRequest) {
  try {
    const seal = req.headers.get("x-kairos-seal");

    if (!seal) {
      return NextResponse.json(
        { ok: false, error: "Missing seal." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const query = String(body?.query || "").trim();
    const replace = String(body?.replace || "").trim();
    const dir = String(body?.dir || "app").trim();
    const apply = Boolean(body?.apply);

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "Missing query." },
        { status: 400 }
      );
    }

    const baseDir = safeResolve(dir);

    const files = walk(baseDir);

    const matches: any[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, "utf8");

        if (!content.includes(query)) continue;

        const relative = path.relative(ROOT, file);

        const updated = content.split(query).join(replace);

        let backup: string | null = null;

        if (apply) {
          const backupDir = safeResolve(
            "ora-data/backups/multi-search-intent"
          );

          fs.mkdirSync(backupDir, { recursive: true });

          backup = path.join(
            backupDir,
            relative.replace(/[\\/]/g, "_") +
              "." +
              Date.now() +
              ".bak"
          );

          fs.writeFileSync(backup, content, "utf8");

          fs.writeFileSync(file, updated, "utf8");
        }

        matches.push({
          file: relative,
          changed: content !== updated,
          applied: apply,
          backup,
          preview: {
            before: query,
            after: replace,
          },
        });
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      engine: "MULTI_SEARCH_INTENT_ENGINE_V1",
      query,
      replace,
      dir,
      apply,
      matches,
      total: matches.length,
      message: apply
        ? "Multi search intent patch aplicado."
        : "Multi search intent preview generado.",
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Internal error.",
      },
      { status: 500 }
    );
  }
}
