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

    try {
      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        walk(full, files);
      } else {
        files.push(full);
      }
    } catch {}
  }

  return files;
}

function detectBlock(lines: string[], index: number) {
  let start = Math.max(0, index - 20);
  let end = Math.min(lines.length - 1, index + 20);

  for (let i = index; i >= 0; i--) {
    const line = lines[i];

    if (
      /function\s+\w+/.test(line) ||
      /export\s+default\s+function/.test(line) ||
      /async\s+function/.test(line) ||
      /const\s+\w+\s*=/.test(line) ||
      /export\s+async\s+function/.test(line)
    ) {
      start = i;
      break;
    }
  }

  return {
    startLine: start + 1,
    endLine: end + 1,
    code: lines.slice(start, end + 1).join("\n"),
  };
}

export async function POST(req: NextRequest) {
  try {
    const seal = req.headers.get("x-kairos-seal");

    if (!seal) {
      return NextResponse.json(
        { ok: false, error: "MISSING_KAIROS_SEAL" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const query = String(body?.query || "").trim();
    const dir = String(body?.dir || "app").trim();
    const limit = Number(body?.limit || 20);
    const contextLines = Number(body?.contextLines || 8);

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "MISSING_QUERY" },
        { status: 400 }
      );
    }

    const baseDir = safeResolve(dir);
    const allFiles = walk(baseDir);
    const matches: any[] = [];

    for (const file of allFiles) {
      if (matches.length >= limit) break;

      try {
        const content = fs.readFileSync(file, "utf8");
        if (!content.includes(query)) continue;

        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          if (!lines[i].includes(query)) continue;

          const from = Math.max(0, i - contextLines);
          const to = Math.min(lines.length - 1, i + contextLines);
          const block = detectBlock(lines, i);

          matches.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            text: lines[i],
            context: {
              startLine: from + 1,
              endLine: to + 1,
              code: lines.slice(from, to + 1).join("\n"),
            },
            block,
          });

          if (matches.length >= limit) break;
        }
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      engine: "SEARCH_CONTEXT_ENGINE_V1",
      query,
      dir,
      count: matches.length,
      matches,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
