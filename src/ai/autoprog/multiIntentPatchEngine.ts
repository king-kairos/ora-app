import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

import {
  authorizeKairosExecution,
} from "../../security/kairosExecutionGate";

import {
  resolveKairosFileTarget,
} from "../../security/kairosFileTarget";

const execAsync = promisify(exec);

const ROOT = path.resolve(process.cwd());

const SKIPPED_DIRECTORY_NAMES = new Set([
  ".git",
  ".next",
  "node_modules",
  "ora-backups",
  "backups",
  "build",
  "dist",
  "coverage",
]);

const MAX_LIMIT = 200;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export type MultiIntentPatchMode =
  | "multi-context"
  | "multi-file";

type PatchMatch = {
  file: string;
  changed: boolean;
  totalMatches: number;
  before: string;
  after: string;
  contexts: Array<{
    line: number;
    context: string;
  }>;
};

type ChangedFile = {
  file: string;
  backup: string;
};

type SkippedFile = {
  file: string;
  reason: string;
};

type EngineResponse = {
  status: number;
  body: Record<string, unknown>;
};

function stamp(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

function cleanError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error || "UNKNOWN_ERROR");
}

function normalizeLimit(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.max(
    1,
    Math.min(Math.floor(parsed), MAX_LIMIT)
  );
}

function countOccurrences(
  content: string,
  search: string
): number {
  if (!search) return 0;

  return content.split(search).length - 1;
}

function buildContexts(
  content: string,
  search: string,
  radius: number
): Array<{
  line: number;
  context: string;
}> {
  const lines = content.split("\n");

  const contexts: Array<{
    line: number;
    context: string;
  }> = [];

  lines.forEach((line, index) => {
    if (!line.includes(search)) return;

    contexts.push({
      line: index + 1,
      context: lines
        .slice(
          Math.max(0, index - radius),
          Math.min(
            lines.length,
            index + radius + 1
          )
        )
        .join("\n"),
    });
  });

  return contexts;
}

async function walkSafe(
  directory: string,
  output: string[] = []
): Promise<string[]> {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (
      entry.isSymbolicLink() ||
      SKIPPED_DIRECTORY_NAMES.has(entry.name)
    ) {
      continue;
    }

    const absolute = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      await walkSafe(absolute, output);
      continue;
    }

    if (entry.isFile()) {
      output.push(absolute);
    }
  }

  return output;
}

async function runBuild() {
  try {
    const result = await execAsync(
      "npm run build",
      {
        cwd: ROOT,
        timeout: 1000 * 60 * 8,
        maxBuffer: 20 * 1024 * 1024,
      }
    );

    return {
      ok: true,
      stdout: String(
        result.stdout || ""
      ).slice(-8000),
      stderr: String(
        result.stderr || ""
      ).slice(-8000),
    };
  } catch (error: any) {
    return {
      ok: false,
      error:
        error?.message ||
        "MULTI_PATCH_BUILD_FAILED",
      stdout: String(
        error?.stdout || ""
      ).slice(-8000),
      stderr: String(
        error?.stderr || ""
      ).slice(-8000),
    };
  }
}

export async function runMultiIntentPatch(
  req: Request,
  mode: MultiIntentPatchMode
): Promise<EngineResponse> {
  try {
    const body = await req
      .json()
      .catch(() => ({}));

    const search = String(
      body?.search ?? ""
    );

    const replace = String(
      body?.replace ?? ""
    );

    const requestedDirectory = String(
      body?.dir || "app"
    ).trim();

    const dryRun =
      body?.dryRun !== false;

    const buildRequested =
      body?.runBuild === true;

    const limit = normalizeLimit(
      body?.limit
    );

    if (!search) {
      return {
        status: 400,
        body: {
          ok: false,
          error: "SEARCH_REQUIRED",
        },
      };
    }

    /*
     * Vista previa:
     * no modifica archivos y permanece libre.
     *
     * Ejecución:
     * toda mutación exige apply_patch.
     */
    if (!dryRun) {
      const patchAuthorization =
        authorizeKairosExecution(
          req,
          "apply_patch"
        );

      if (!patchAuthorization.ok) {
        return {
          status:
            patchAuthorization.status,
          body: {
            ok: false,
            mode,
            dryRun,
            action:
              patchAuthorization.action,
            error:
              patchAuthorization.error,
          },
        };
      }

      /*
       * Build es un segundo efecto real.
       * Aunque apply_patch esté autorizado,
       * ejecutar npm run build requiere
       * modify_runtime explícitamente.
       */
      if (buildRequested) {
        const buildAuthorization =
          authorizeKairosExecution(
            req,
            "modify_runtime"
          );

        if (!buildAuthorization.ok) {
          return {
            status:
              buildAuthorization.status,
            body: {
              ok: false,
              mode,
              dryRun,
              action:
                buildAuthorization.action,
              error:
                buildAuthorization.error,
            },
          };
        }
      }
    }

    const baseTarget =
      resolveKairosFileTarget(
        requestedDirectory
      );

    const baseStat = await fs.stat(
      baseTarget.absolute
    );

    if (!baseStat.isDirectory()) {
      return {
        status: 400,
        body: {
          ok: false,
          error:
            "PATCH_DIRECTORY_REQUIRED",
          dir: baseTarget.relative,
        },
      };
    }

    const files = await walkSafe(
      baseTarget.absolute
    );

    const matches: PatchMatch[] = [];
    const changedFiles: ChangedFile[] = [];
    const skippedFiles: SkippedFile[] = [];

    const backupRoot = path.join(
      ROOT,
      "ora-backups",
      mode,
      stamp()
    );

    const contextRadius =
      mode === "multi-context"
        ? 4
        : 2;

    for (const absoluteCandidate of files) {
      if (matches.length >= limit) {
        break;
      }

      const relativeCandidate =
        path.relative(
          ROOT,
          absoluteCandidate
        );

      try {
        const target =
          resolveKairosFileTarget(
            relativeCandidate
          );

        const stat = await fs.stat(
          target.absolute
        );

        if (
          !stat.isFile() ||
          stat.size > MAX_FILE_BYTES
        ) {
          skippedFiles.push({
            file: target.relative,
            reason:
              stat.size > MAX_FILE_BYTES
                ? "FILE_TOO_LARGE"
                : "NOT_REGULAR_FILE",
          });

          continue;
        }

        const content = await fs.readFile(
          target.absolute,
          "utf8"
        );

        if (!content.includes(search)) {
          continue;
        }

        const updated =
          content.replaceAll(
            search,
            replace
          );

        const contexts = buildContexts(
          content,
          search,
          contextRadius
        );

        const totalMatches =
          countOccurrences(
            content,
            search
          );

        matches.push({
          file: target.relative,
          changed: updated !== content,
          totalMatches,
          before: search,
          after: replace,
          contexts,
        });

        if (
          dryRun ||
          updated === content
        ) {
          continue;
        }

        const backupFile = path.join(
          backupRoot,
          target.relative
        );

        await fs.mkdir(
          path.dirname(backupFile),
          {
            recursive: true,
          }
        );

        await fs.copyFile(
          target.absolute,
          backupFile
        );

        /*
         * La ruta vuelve a resolverse
         * inmediatamente antes de escribir.
         */
        const writeTarget =
          resolveKairosFileTarget(
            target.relative
          );

        await fs.writeFile(
          writeTarget.absolute,
          updated,
          "utf8"
        );

        changedFiles.push({
          file: writeTarget.relative,
          backup: path.relative(
            ROOT,
            backupFile
          ),
        });
      } catch (error) {
        skippedFiles.push({
          file: relativeCandidate,
          reason: cleanError(error),
        });
      }
    }

    let build: Record<
      string,
      unknown
    > | null = null;

    if (
      !dryRun &&
      buildRequested
    ) {
      build = await runBuild();
    }

    const buildPassed =
      build === null ||
      build.ok === true;

    return {
      status: buildPassed
        ? 200
        : 409,
      body: {
        ok: buildPassed,
        engine:
          mode === "multi-context"
            ? "KAIROS_MULTI_CONTEXT_PATCH_V3"
            : "KAIROS_MULTI_FILE_PATCH_V3",
        mode,
        dryRun,
        executionAuthorized:
          !dryRun,
        buildRequested,
        limit,
        scannedFiles: files.length,
        matchedFiles: matches.length,
        changedCount:
          changedFiles.length,
        matches,
        changedFiles,
        skippedFiles:
          skippedFiles.slice(0, 100),
        skippedCount:
          skippedFiles.length,
        build,
        backupRoot: dryRun
          ? null
          : path.relative(
              ROOT,
              backupRoot
            ),
        message: dryRun
          ? "Vista previa completada. No se modificó ningún archivo."
          : buildPassed
            ? "Patch múltiple aplicado bajo la Puerta Kairos."
            : "Los archivos fueron modificados, pero el build falló.",
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        ok: false,
        mode,
        error: cleanError(error),
      },
    };
  }
}
