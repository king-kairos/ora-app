import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

const ROOT = process.cwd();

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeResolve(filePath: string) {
  const resolved = path.resolve(ROOT, filePath);

  if (!resolved.startsWith(ROOT)) {
    throw new Error("Ruta inválida.");
  }

  return resolved;
}

function getAllowedSeals() {
  return [
    process.env.KAIROS_SEAL,
  ]
    .filter(Boolean)
    .map((x) => String(x).trim());
}

async function walk(
  dir: string,
  results: string[] = []
) {
  const list = await fs.readdir(dir, {
    withFileTypes: true,
  });

  for (const item of list) {
    const full = path.join(dir, item.name);

    if (
      full.includes(".next") ||
      full.includes("node_modules") ||
      full.includes(".git") ||
      full.includes("ora-backups")
    ) {
      continue;
    }

    if (item.isDirectory()) {
      await walk(full, results);
    } else {
      results.push(full);
    }
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    const seal = String(
      req.headers.get("x-kairos-seal") ||
      req.headers.get("kairos-seal") ||
      ""
    ).trim();

    const allowedSeals = getAllowedSeals();

    if (!seal || !allowedSeals.includes(seal)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid seal",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const search = String(body.search || "").trim();

    const replace = String(body.replace || "").trim();

    const dir = String(body.dir || "app").trim();

    const dryRun = body.dryRun !== false;

    const runBuild = body.runBuild === true;

    const limit = Math.max(
      1,
      Math.min(Number(body.limit || 20), 200)
    );

    if (!search) {
      return NextResponse.json(
        {
          ok: false,
          error: "search requerido",
        },
        { status: 400 }
      );
    }

    const baseDir = safeResolve(dir);

    const files = await walk(baseDir);

    const matches: any[] = [];

    const changedFiles: any[] = [];

    const backupRoot = path.join(
      ROOT,
      "ora-backups",
      "multi-file",
      stamp()
    );

    for (const file of files) {
      if (matches.length >= limit) {
        break;
      }

      try {
        const content = await fs.readFile(
          file,
          "utf8"
        );

        if (!content.includes(search)) {
          continue;
        }

        const updated = content.replaceAll(
          search,
          replace
        );

        const relative = path.relative(
          ROOT,
          file
        );

        const lines = content.split("\n");

        const contexts: any[] = [];

        lines.forEach((line, index) => {
          if (line.includes(search)) {
            contexts.push({
              line: index + 1,
              context: lines
                .slice(
                  Math.max(0, index - 2),
                  Math.min(lines.length, index + 3)
                )
                .join("\n"),
            });
          }
        });

        matches.push({
          file: relative,
          totalMatches: contexts.length,
          changed: updated !== content,
          before: search,
          after: replace,
          contexts,
          preview: {
            before: search,
            after: replace,
          },
        });

        if (!dryRun && updated !== content) {
          const backupFile = path.join(
            backupRoot,
            relative
          );

          await fs.mkdir(
            path.dirname(backupFile),
            {
              recursive: true,
            }
          );

          await fs.copyFile(
            file,
            backupFile
          );

          await fs.writeFile(
            file,
            updated,
            "utf8"
          );

          changedFiles.push({
            file: relative,
            backup: path.relative(
              ROOT,
              backupFile
            ),
          });
        }
      } catch {}
    }

    let build: any = null;

    if (!dryRun && runBuild) {
      try {
        const result = await execAsync(
          "npm run build",
          {
            cwd: ROOT,
            timeout: 120000,
            maxBuffer: 1024 * 1024 * 10,
          }
        );

        build = {
          ok: true,
          stdout: result.stdout.slice(-3000),
          stderr: result.stderr.slice(-3000),
        };
      } catch (err: any) {
        build = {
          ok: false,
          error: err.message,
          stdout: err.stdout?.slice(-3000),
          stderr: err.stderr?.slice(-3000),
        };
      }
    }

    return NextResponse.json({
      ok: true,
      engine: "MULTI_FILE_CONTEXT_PATCH_ENGINE",
      dryRun,
      totalFiles: matches.length,
      matches,
      changedFiles,
      build,
      backupRoot: dryRun
        ? null
        : path.relative(ROOT, backupRoot),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
