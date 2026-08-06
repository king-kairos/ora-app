export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec as execCallback } from "child_process";
import { promisify } from "util";
import { authorizeKairosExecution } from "../../../../../src/security/kairosExecutionGate";

const execAsync = promisify(execCallback);

const ROOT = process.cwd();

const ALLOWED_BACKUP_ROOTS = [
  path.resolve(ROOT, "ora-data/backups"),
  path.resolve(ROOT, "ora-backups"),
];

const ROLLBACK_HISTORY_DIR = path.resolve(
  ROOT,
  "data/autoprog/rollback"
);

const ROLLBACK_HISTORY_FILE = path.join(
  ROLLBACK_HISTORY_DIR,
  "history.jsonl"
);

const PRE_ROLLBACK_DIR = path.resolve(
  ROOT,
  "ora-data/backups/pre-rollback"
);

const EXCLUDED_NAMES = new Set([
  ".git",
  ".next",
  "node_modules",
  "ora-data",
  "ora-backups",
  "data",
]);

const DEFAULT_EXCLUDED_PATHS = [
  ".git",
  ".next",
  "node_modules",
  "data",
  "ora-data",
  "ora-backups",
  "app/build",
];

const MAX_FILES_WITHOUT_LARGE_CONFIRMATION = 100;

type RestoreItem = {
  source: string;
  target: string;
  relative: string;
  type: "file";
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function isInside(parent: string, child: string) {
  const relative = path.relative(parent, child);

  return (
    relative === "" ||
    (
      !relative.startsWith("..") &&
      !path.isAbsolute(relative)
    )
  );
}

function resolveAllowedBackup(input: string) {
  const absolute = path.resolve(ROOT, input);

  const allowed = ALLOWED_BACKUP_ROOTS.some(
    (base) => isInside(base, absolute)
  );

  if (!allowed) {
    throw new Error("BACKUP_ROOT_NOT_ALLOWED");
  }

  if (!fs.existsSync(absolute)) {
    throw new Error("BACKUP_ROOT_NOT_FOUND");
  }

  if (!fs.statSync(absolute).isDirectory()) {
    throw new Error("BACKUP_ROOT_NOT_DIRECTORY");
  }

  return absolute;
}

function walkFiles(dir: string, base = dir): RestoreItem[] {
  const output: RestoreItem[] = [];

  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true,
  })) {
    if (EXCLUDED_NAMES.has(entry.name)) {
      continue;
    }

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      output.push(...walkFiles(full, base));
      continue;
    }

    if (!entry.isFile()) continue;

    let relative = path.relative(base, full);

    /*
      Algunos backups guardan el árbol completo dentro
      de una carpeta con el nombre del proyecto.
    */
    const pieces = relative.split(path.sep);

    if (
      pieces.length > 1 &&
      (
        pieces[0] === "ora-app" ||
        pieces[0] === path.basename(ROOT)
      )
    ) {
      relative = pieces.slice(1).join(path.sep);
    }

    if (!relative || relative.startsWith("..")) {
      continue;
    }

    const target = path.resolve(ROOT, relative);

    if (!isInside(ROOT, target)) {
      continue;
    }

    output.push({
      source: full,
      target,
      relative,
      type: "file",
    });
  }

  return output;
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

function filterRestoreItems(
  items: RestoreItem[],
  includePaths: string[],
  excludePaths: string[]
) {
  return items.filter((item) => {
    const relative = normalizeRelativePath(
      item.relative
    );

    const included =
      includePaths.length === 0 ||
      includePaths.some((prefix) =>
        pathMatchesPrefix(relative, prefix)
      );

    if (!included) return false;

    const excluded = excludePaths.some(
      (prefix) =>
        pathMatchesPrefix(relative, prefix)
    );

    return !excluded;
  });
}

function copyFileWithDirs(
  source: string,
  target: string
) {
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function writeHistory(entry: Record<string, unknown>) {
  ensureDir(ROLLBACK_HISTORY_DIR);

  fs.appendFileSync(
    ROLLBACK_HISTORY_FILE,
    JSON.stringify(entry) + "\n",
    "utf8"
  );
}

async function runBuild() {
  try {
    const result = await execAsync(
      "npm run build",
      {
        cwd: ROOT,
        timeout: 240000,
        maxBuffer: 16 * 1024 * 1024,
      }
    );

    return {
      ok: true,
      stdout: String(result.stdout || "").slice(-10000),
      stderr: String(result.stderr || "").slice(-10000),
    };
  } catch (error: any) {
    return {
      ok: false,
      stdout: String(error?.stdout || "").slice(-10000),
      stderr: String(
        error?.stderr ||
        error?.message ||
        "ROLLBACK_BUILD_FAILED"
      ).slice(-10000),
    };
  }
}

export async function GET(_req: Request) {
  const history = fs.existsSync(ROLLBACK_HISTORY_FILE)
    ? fs
        .readFileSync(
          ROLLBACK_HISTORY_FILE,
          "utf8"
        )
        .trim()
        .split("\n")
        .filter(Boolean)
        .slice(-30)
        .reverse()
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    : [];

  return NextResponse.json({
    ok: true,
    mode: "ROLLBACK_ENGINE",
    allowedBackupRoots: ALLOWED_BACKUP_ROOTS.map(
      (item) => path.relative(ROOT, item)
    ),
    history,
    message:
      "Rollback Engine disponible. Use dryRun antes de execute.",
  });
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const rollbackId = `rollback-${startedAt}`;
  let executionAuthorized = false;

  try {
    const body = await req
      .json()
      .catch(() => ({}));

    const backupRootInput = String(
      body?.backupRoot || ""
    ).trim();

    const proposalId = String(
      body?.proposalId || ""
    ).trim() || null;

    const branch = String(
      body?.branch || ""
    ).trim() || null;

    const execute = body?.execute === true;

    /*
     * FRONTERA SOBERANA TEMPRANA
     *
     * El análisis y dry run permanecen libres.
     * Cuando execute=true, la Puerta Kairos debe
     * autorizar antes de cualquier escritura,
     * restauración, build, historial o deploy.
     */
    if (execute) {
      const authorization =
        authorizeKairosExecution(
          req,
          "rollback"
        );

      if (!authorization.ok) {
        return NextResponse.json(
          {
            ok: false,
            mode:
              "ROLLBACK_EXECUTION_BLOCKED",
            rollbackId,
            action: authorization.action,
            error: authorization.error,
            dryRunAvailable: true,
            executeRequired: true,
            message:
              "La ejecución real del rollback requiere autorización mediante la Puerta Kairos.",
          },
          {
            status: authorization.status,
          }
        );
      }

      executionAuthorized = true;
    }

    const includePaths = normalizePathList(
      body?.includePaths
    );

    const requestedExcludePaths =
      normalizePathList(body?.excludePaths);

    const excludePaths = Array.from(
      new Set([
        ...DEFAULT_EXCLUDED_PATHS,
        ...requestedExcludePaths,
      ])
    );

    const allowFullRollback =
      body?.allowFullRollback === true;

    const allowLargeRollback =
      body?.allowLargeRollback === true;

    const confirmation = String(
      body?.confirmation || ""
    ).trim();

    if (!backupRootInput) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_BACKUP_ROOT",
          message:
            "Debe indicar backupRoot dentro de ora-data/backups u ora-backups.",
        },
        {
          status: 400,
        }
      );
    }

    const backupRoot = resolveAllowedBackup(
      backupRootInput
    );

    const allItems = walkFiles(backupRoot);

    const items = filterRestoreItems(
      allItems,
      includePaths,
      excludePaths
    );

    if (items.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "BACKUP_EMPTY",
          backupRoot: path.relative(
            ROOT,
            backupRoot
          ),
        },
        {
          status: 409,
        }
      );
    }

    const preview = items.map((item) => ({
      relative: item.relative,
      targetExists: fs.existsSync(item.target),
      size: fs.statSync(item.source).size,
    }));

    if (
      execute &&
      includePaths.length === 0 &&
      !allowFullRollback
    ) {
      return NextResponse.json(
        {
          ok: false,
          mode: "ROLLBACK_FULL_BLOCKED",
          rollbackId,
          error: "INCLUDE_PATHS_REQUIRED",
          filesCount: items.length,
          message:
            "Rollback completo bloqueado. Indique includePaths o autorice allowFullRollback explícitamente.",
        },
        { status: 409 }
      );
    }

    if (
      execute &&
      items.length >
        MAX_FILES_WITHOUT_LARGE_CONFIRMATION &&
      !allowLargeRollback
    ) {
      return NextResponse.json(
        {
          ok: false,
          mode: "ROLLBACK_LARGE_BLOCKED",
          rollbackId,
          error:
            "LARGE_ROLLBACK_CONFIRMATION_REQUIRED",
          filesCount: items.length,
          maximumWithoutConfirmation:
            MAX_FILES_WITHOUT_LARGE_CONFIRMATION,
          message:
            "Rollback grande bloqueado. Revise el dryRun y use allowLargeRollback solamente si la selección es correcta.",
        },
        { status: 409 }
      );
    }

    if (
      execute &&
      allowFullRollback &&
      confirmation !==
        "CONFIRM_FULL_ROLLBACK_KAIROS"
    ) {
      return NextResponse.json(
        {
          ok: false,
          mode:
            "ROLLBACK_FULL_CONFIRMATION_REQUIRED",
          rollbackId,
          error:
            "INVALID_FULL_ROLLBACK_CONFIRMATION",
          message:
            "La restauración completa requiere confirmation: CONFIRM_FULL_ROLLBACK_KAIROS.",
        },
        { status: 409 }
      );
    }

    if (!execute) {
      return NextResponse.json({
        ok: true,
        mode: "ROLLBACK_DRY_RUN",
        rollbackId,
        executeRequired: true,
        backupRoot: path.relative(
          ROOT,
          backupRoot
        ),
        totalBackupFiles: allItems.length,
        filesCount: items.length,
        truncated:
          preview.length > 300,
        includePaths,
        excludePaths,
        fullRollback:
          includePaths.length === 0,
        largeRollback:
          items.length >
          MAX_FILES_WITHOUT_LARGE_CONFIRMATION,
        files: preview.slice(0, 300),
        message:
          "Vista previa selectiva completada. No se modificó ningún archivo.",
      });
    }

    /*
     * EJECUCIÓN REAL AUTORIZADA
     *
     * La Puerta Kairos fue validada al comienzo
     * del flujo cuando execute=true.
     */
    const safetyRoot = path.join(
      PRE_ROLLBACK_DIR,
      rollbackId
    );

    ensureDir(safetyRoot);

    const restored: Array<{
      relative: string;
      previousBackup: string | null;
      targetExistedBefore: boolean;
    }> = [];

    for (const item of items) {
      let previousBackup: string | null = null;

      const targetExistedBefore =
        fs.existsSync(item.target);

      if (targetExistedBefore) {
        const safetyTarget = path.join(
          safetyRoot,
          item.relative
        );

        copyFileWithDirs(
          item.target,
          safetyTarget
        );

        previousBackup = path.relative(
          ROOT,
          safetyTarget
        );
      }

      copyFileWithDirs(
        item.source,
        item.target
      );

      restored.push({
        relative: item.relative,
        previousBackup,
        targetExistedBefore,
      });
    }

    const build = await runBuild();

    if (!build.ok) {
      /*
        Si el rollback restaurado no compila,
        se devuelve automáticamente el estado
        que existía antes de comenzar el rollback.
      */
      for (const item of restored) {
        const target = path.resolve(
          ROOT,
          item.relative
        );

        if (
          !item.targetExistedBefore &&
          fs.existsSync(target)
        ) {
          fs.rmSync(target, {
            force: true,
          });
          continue;
        }

        if (!item.previousBackup) continue;

        const previousAbsolute = path.resolve(
          ROOT,
          item.previousBackup
        );

        if (fs.existsSync(previousAbsolute)) {
          copyFileWithDirs(
            previousAbsolute,
            target
          );
        }
      }

      const recoveryBuild = await runBuild();

      const failureRecord = {
        id: rollbackId,
        mode: "ROLLBACK_REJECTED_BUILD_FAILED",
        ok: false,
        proposalId,
        branch,
        backupRoot: path.relative(
          ROOT,
          backupRoot
        ),
        safetyRoot: path.relative(
          ROOT,
          safetyRoot
        ),
        filesCount: restored.length,
        includePaths,
        excludePaths,
        rollbackBuild: build,
        recoveryBuild,
        createdAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      };

      writeHistory(failureRecord);

      return NextResponse.json(
        {
          ...failureRecord,
          message:
            "El backup restaurado no compiló. ORA recuperó el estado anterior al intento de rollback.",
        },
        {
          status: 409,
        }
      );
    }

    /*
      Se usa el deploy soberano existente para que
      reinicio y publicación sigan bajo el flujo actual.
    */
    const seal = String(
      req.headers.get("x-kairos-seal") || ""
    );

    const deploy = await fetch(
      "http://127.0.0.1:3001/api/ora/system/deploy",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kairos-seal": seal,
        },
        body: JSON.stringify({
          proposalId:
            proposalId || rollbackId,
          rollbackId,
          source: "rollback-engine",
        }),
      }
    )
      .then(async (res) => {
        const data = await res
          .json()
          .catch(() => ({}));

        return {
          ok: res.ok && data?.ok !== false,
          status: res.status,
          data,
        };
      })
      .catch((error: any) => ({
        ok: false,
        status: 500,
        data: {
          error:
            error?.message ||
            "ROLLBACK_DEPLOY_CALL_FAILED",
        },
      }));

    const successRecord = {
      id: rollbackId,
      mode: "ROLLBACK_APPLIED",
      ok: true,
      proposalId,
      branch,
      backupRoot: path.relative(
        ROOT,
        backupRoot
      ),
      safetyRoot: path.relative(
        ROOT,
        safetyRoot
      ),
      filesCount: restored.length,
      includePaths,
      excludePaths,
      buildPassed: true,
      deploy,
      smokeTestPending: true,
      createdAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
    };

    writeHistory(successRecord);

    return NextResponse.json({
      ...successRecord,
      message:
        "Rollback restaurado, build validado y deploy soberano iniciado. Ejecute Smoke Test final.",
    });
  } catch (error: any) {
    const failure = {
      id: rollbackId,
      ok: false,
      mode: "ROLLBACK_ENGINE_FAILED",
      error:
        error?.message ||
        "ROLLBACK_ENGINE_FAILED",
      createdAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
    };

    if (executionAuthorized) {
      writeHistory(failure);
    }

    return NextResponse.json(
      failure,
      {
        status: 500,
      }
    );
  }
}
