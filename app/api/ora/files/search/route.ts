import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".txt",
  ".css",
]);

const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "ora-data",
  ".pm2",
]);

function safeResolve(inputPath: string) {
  const resolved = path.resolve(ROOT, inputPath || ".");
  if (!resolved.startsWith(ROOT)) throw new Error("INVALID_PATH");
  return resolved;
}

function walk(dir: string, results: string[] = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, results);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;

    results.push(full);
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const query = String(body?.query || body?.q || "").trim();
    const baseDir = String(body?.dir || ".").trim();
    const limit = Math.min(Number(body?.limit || 50), 200);

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "QUERY_REQUIRED" },
        { status: 400 }
      );
    }

    const resolvedDir = safeResolve(baseDir);

    if (!fs.existsSync(resolvedDir)) {
      return NextResponse.json(
        { ok: false, error: "DIR_NOT_FOUND" },
        { status: 404 }
      );
    }

    const stat = fs.statSync(resolvedDir);

    if (!stat.isDirectory()) {
      return NextResponse.json(
        { ok: false, error: "NOT_A_DIRECTORY" },
        { status: 400 }
      );
    }

    const files = walk(resolvedDir);
    const matches: any[] = [];

    for (const file of files) {
      if (matches.length >= limit) break;

      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (matches.length >= limit) break;

        if (lines[i].includes(query)) {
          matches.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            text: lines[i].trim(),
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      query,
      dir: baseDir,
      count: matches.length,
      matches,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "SEARCH_FAILED",
      },
      { status: 500 }
    );
  }
}
