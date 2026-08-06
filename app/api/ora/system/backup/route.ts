export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { authorizeKairosExecution } from "../../../../../src/security/kairosExecutionGate";

const ROOT = process.cwd();
const SNAPSHOTS_ROOT = path.resolve(ROOT, "ora-backups", "snapshots");

const DEFAULT_TARGETS = [
  "src",
  "app",
  "ora-data",
  "package.json",
  "next.config.js",
  "next.config.ts",
];

const ALWAYS_EXCLUDED = new Set([
  ".git",
  ".next",
  "node_modules",
  "ora-backups",
]);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}


function isInside(parent: string, child: string) {
  const relative = path.relative(parent, child);

  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function normalizeRelativePath(input: unknown) {
  return String(input || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function normalizePathList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .map(normalizeRelativePath)
        .filter(Boolean)
    )
  );
}

function pathMatchesPrefix(
  relativeInput: string,
  prefixInput: string
) {
  const relative = normalizeRelativePath(relativeInput);
  const prefix = normalizeRelativePath(prefixInput);

  return (
    relative === prefix ||
    relative.startsWith(`${prefix}/`)
  );
}

function isExcludedPath(
  relative: string,
  excludePaths: string[]
) {
  const normalized = normalizeRelativePath(relative);
  const firstSegment = normalized.split("/")[0];

  if (ALWAYS_EXCLUDED.has(firstSegment)) {
    return true;
  }

  return excludePaths.some((prefix) =>
    pathMatchesPrefix(normalized, prefix)
  );
}

async function pathExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function copyRecursive(
  source: string,
  destination: string,
  relativeRoot: string,
  excludePaths: string[],
  copiedFiles: string[]
) {
  const stat = await fs.stat(source);

  if (stat.isDirectory()) {
    await ensureDir(destination);

    const entries = await fs.readdir(source, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const sourceChild = path.join(source, entry.name);
      const destinationChild = path.join(
        destination,
        entry.name
      );

      const relativeChild = normalizeRelativePath(
        path.join(relativeRoot, entry.name)
      );

      if (
        isExcludedPath(
          relativeChild,
          excludePaths
        )
      ) {
        continue;
      }

      await copyRecursive(
        sourceChild,
        destinationChild,
        relativeChild,
        excludePaths,
        copiedFiles
      );
    }

    return;
  }

  if (!stat.isFile()) return;

  await ensureDir(path.dirname(destination));
  await fs.copyFile(source, destination);

  copiedFiles.push(
    normalizeRelativePath(relativeRoot)
  );
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const authorization =
      authorizeKairosExecution(
        req,
        "backup"
      );

    if (!authorization.ok) {
      return NextResponse.json(
        {
          ok: false,
          action: authorization.action,
          error: authorization.error,
        },
        {
          status: authorization.status,
        }
      );
    }

    const body = await req
      .json()
      .catch(() => ({}));

    const proposalId =
      String(body?.proposalId || "").trim() || null;

    const branch =
      String(body?.branch || "").trim() || null;

    const source =
      String(body?.source || "").trim() ||
      "manual-backup";

    const requestedIncludePaths =
      normalizePathList(body?.includePaths);

    const excludePaths = normalizePathList(
      body?.excludePaths
    );

    const includePaths =
      requestedIncludePaths.length > 0
        ? requestedIncludePaths
        : DEFAULT_TARGETS;

    const stamp = timestamp();

    const snapshotDir = path.join(
      SNAPSHOTS_ROOT,
      stamp
    );

    await ensureDir(snapshotDir);

    const copiedFiles: string[] = [];
    const missingPaths: string[] = [];
    const rejectedPaths: string[] = [];

    for (const relativeInput of includePaths) {
      const relative = normalizeRelativePath(
        relativeInput
      );

      if (!relative) continue;

      const sourcePath = path.resolve(
        ROOT,
        relative
      );

      if (!isInside(ROOT, sourcePath)) {
        rejectedPaths.push(relative);
        continue;
      }

      if (isExcludedPath(relative, excludePaths)) {
        rejectedPaths.push(relative);
        continue;
      }

      if (!(await pathExists(sourcePath))) {
        missingPaths.push(relative);
        continue;
      }

      const destinationPath = path.resolve(
        snapshotDir,
        relative
      );

      if (!isInside(snapshotDir, destinationPath)) {
        rejectedPaths.push(relative);
        continue;
      }

      await copyRecursive(
        sourcePath,
        destinationPath,
        relative,
        excludePaths,
        copiedFiles
      );
    }

    const backupRoot = path.relative(
      ROOT,
      snapshotDir
    );

    const manifest = {
      ok: true,
      mode: "SELECTIVE_BACKUP_ENGINE",
      backup: stamp,
      backupRoot,
      snapshotDir,
      proposalId,
      branch,
      source,
      includePaths,
      excludePaths,
      copiedFilesCount: copiedFiles.length,
      copiedFiles,
      missingPaths,
      rejectedPaths,
      createdAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
    };

    await fs.writeFile(
      path.join(
        snapshotDir,
        "backup-manifest.json"
      ),
      JSON.stringify(manifest, null, 2),
      "utf8"
    );

    if (copiedFiles.length === 0) {
      return NextResponse.json(
        {
          ...manifest,
          ok: false,
          error: "NO_FILES_COPIED",
          message:
            "No se encontró ningún archivo válido para respaldar.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json({
      ...manifest,
      message:
        "Backup selectivo creado bajo Sello de Kairos.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        mode: "SELECTIVE_BACKUP_ENGINE_FAILED",
        error:
          error?.message ||
          "SELECTIVE_BACKUP_ENGINE_FAILED",
        createdAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      },
      {
        status: 500,
      }
    );
  }
}
