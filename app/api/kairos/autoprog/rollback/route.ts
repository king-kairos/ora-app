export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { exec as execCallback } from "child_process";
import { promisify } from "util";
import { authorizeKairosExecution } from "../../../../../src/security/kairosExecutionGate";
import { patchProposalMetadata } from "../../../../../src/ai/autoprog/patchStore";

const execAsync = promisify(execCallback);

const ROOT = process.cwd();

const ALLOWED_BACKUP_ROOTS = [
  path.resolve(ROOT, "ora-data/backups"),
  path.resolve(ROOT, "ora-backups"),
];

const DEPLOY_CHECKPOINT_ROOT = path.resolve(
  ROOT,
  "ora-data/deploy-checkpoints"
);

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

function resolveDeployCheckpoint(
  checkpointIdInput: unknown
) {
  const checkpointId =
    String(
      checkpointIdInput || ""
    ).trim();

  if (
    !/^checkpoint-\d+-[a-f0-9]{12}$/.test(
      checkpointId
    )
  ) {
    throw new Error(
      "INVALID_DEPLOY_CHECKPOINT_ID"
    );
  }

  const checkpointDir =
    path.resolve(
      DEPLOY_CHECKPOINT_ROOT,
      checkpointId
    );

  if (
    checkpointDir ===
      DEPLOY_CHECKPOINT_ROOT ||
    !checkpointDir.startsWith(
      DEPLOY_CHECKPOINT_ROOT +
        path.sep
    )
  ) {
    throw new Error(
      "DEPLOY_CHECKPOINT_OUTSIDE_ROOT"
    );
  }

  return {
    checkpointId,
    checkpointDir,
    manifestFile:
      path.join(
        checkpointDir,
        "manifest.json"
      ),
  };
}

function readDeployCheckpointManifest(
  checkpointIdInput: unknown
) {
  const resolved =
    resolveDeployCheckpoint(
      checkpointIdInput
    );

  if (
    !fs.existsSync(
      resolved.manifestFile
    )
  ) {
    throw new Error(
      "DEPLOY_CHECKPOINT_MANIFEST_MISSING"
    );
  }

  let manifest: any;

  try {
    manifest =
      JSON.parse(
        fs.readFileSync(
          resolved.manifestFile,
          "utf8"
        )
      );
  } catch {
    throw new Error(
      "DEPLOY_CHECKPOINT_MANIFEST_INVALID"
    );
  }

  if (
    manifest?.checkpointId !==
      resolved.checkpointId ||
    manifest?.phase !==
      "pre_apply" ||
    typeof manifest?.proposalId !==
      "string" ||
    !manifest.proposalId.trim() ||
    !Array.isArray(
      manifest?.files
    ) ||
    !Array.isArray(
      manifest?.registries
    )
  ) {
    throw new Error(
      "DEPLOY_CHECKPOINT_MANIFEST_INVALID"
    );
  }

  const files =
    validateDeployCheckpointEntries(
      resolved.checkpointDir,
      manifest.files
    );

  const registries =
    validateDeployCheckpointEntries(
      resolved.checkpointDir,
      manifest.registries
    );

  const allEntries =
    [
      ...files,
      ...registries,
    ];

  const seenPaths =
    new Set<string>();

  for (const entry of allEntries) {
    if (
      seenPaths.has(
        entry.path
      )
    ) {
      throw new Error(
        `DEPLOY_CHECKPOINT_DUPLICATE_PATH:${entry.path}`
      );
    }

    seenPaths.add(
      entry.path
    );
  }

  const runtimeDataPaths =
    files
      .map((entry: any) =>
        String(
          entry?.path || ""
        ).trim()
      )
      .filter(
        (relativePath: string) =>
          relativePath === "data" ||
          relativePath.startsWith(
            "data/"
          )
      );

  const runtimeDataSensitive =
    runtimeDataPaths.length > 0;

  const manifestRuntimeDataPaths =
    Array.isArray(
      manifest?.runtimeDataPaths
    )
      ? manifest.runtimeDataPaths
          .map((value: unknown) =>
            String(
              value || ""
            ).trim()
          )
          .filter(Boolean)
      : [];

  if (
    manifest?.runtimeDataSensitive !==
      runtimeDataSensitive ||
    JSON.stringify(
      manifestRuntimeDataPaths
    ) !==
      JSON.stringify(
        runtimeDataPaths
      )
  ) {
    throw new Error(
      "DEPLOY_CHECKPOINT_RUNTIME_DATA_METADATA_MISMATCH"
    );
  }

  return {
    ...resolved,
    manifest,
    files,
    registries,
    runtimeDataSensitive,
    runtimeDataPaths,
  };
}

function validateDeployCheckpointEntries(
  checkpointDir: string,
  entriesInput: unknown
) {
  if (!Array.isArray(entriesInput)) {
    throw new Error(
      "DEPLOY_CHECKPOINT_ENTRIES_INVALID"
    );
  }

  const checkpointRoot =
    path.resolve(
      checkpointDir
    );

  const validated = [];

  for (const entry of entriesInput) {
    const relative =
      normalizeRelativePath(
        entry?.path
      );

    if (
      !relative ||
      relative === "." ||
      relative === ".." ||
      relative.startsWith("../") ||
      relative.includes("/../")
    ) {
      throw new Error(
        "DEPLOY_CHECKPOINT_ENTRY_PATH_INVALID"
      );
    }

    const target =
      path.resolve(
        ROOT,
        relative
      );

    if (!isInside(ROOT, target)) {
      throw new Error(
        "DEPLOY_CHECKPOINT_ENTRY_OUTSIDE_ROOT"
      );
    }

    if (
      typeof entry?.existed !==
      "boolean"
    ) {
      throw new Error(
        `DEPLOY_CHECKPOINT_ENTRY_EXISTED_INVALID:${relative}`
      );
    }

    if (entry.existed === false) {
      if (
        entry?.backupFile !== null ||
        entry?.backupSha256 !== null
      ) {
        throw new Error(
          `DEPLOY_CHECKPOINT_ABSENT_ENTRY_INVALID:${relative}`
        );
      }

      validated.push({
        path: relative,
        target,
        existed: false,
        backupFile: null,
        backupAbsolute: null,
        backupSha256: null,
      });

      continue;
    }

    const backupFile =
      String(
        entry?.backupFile || ""
      ).trim();

    const expectedSha256 =
      String(
        entry?.backupSha256 || ""
      ).trim()
      .toLowerCase();

    if (
      !backupFile ||
      !/^[a-f0-9]{64}$/.test(
        expectedSha256
      )
    ) {
      throw new Error(
        `DEPLOY_CHECKPOINT_BACKUP_IDENTITY_INVALID:${relative}`
      );
    }

    const backupAbsolute =
      path.resolve(
        checkpointRoot,
        backupFile
      );

    if (
      backupAbsolute ===
        checkpointRoot ||
      !isInside(
        checkpointRoot,
        backupAbsolute
      )
    ) {
      throw new Error(
        `DEPLOY_CHECKPOINT_BACKUP_OUTSIDE_CHECKPOINT:${relative}`
      );
    }

    if (
      !fs.existsSync(
        backupAbsolute
      )
    ) {
      throw new Error(
        `DEPLOY_CHECKPOINT_BACKUP_MISSING:${relative}`
      );
    }

    const stat =
      fs.lstatSync(
        backupAbsolute
      );

    if (
      stat.isSymbolicLink() ||
      !stat.isFile()
    ) {
      throw new Error(
        `DEPLOY_CHECKPOINT_BACKUP_NOT_REGULAR_FILE:${relative}`
      );
    }

    const actualSha256 =
      crypto
        .createHash("sha256")
        .update(
          fs.readFileSync(
            backupAbsolute
          )
        )
        .digest("hex");

    if (
      actualSha256 !==
      expectedSha256
    ) {
      throw new Error(
        `DEPLOY_CHECKPOINT_BACKUP_SHA256_MISMATCH:${relative}`
      );
    }

    validated.push({
      path: relative,
      target,
      existed: true,
      backupFile,
      backupAbsolute,
      backupSha256:
        expectedSha256,
    });
  }

  return validated;
}

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

function restoreCheckpointEntriesSafely(
  checkpointEntries: any[],
  safetyRoot: string
) {
  ensureDir(safetyRoot);

  const safetyEntries: Array<{
    path: string;
    target: string;
    existedBefore: boolean;
    safetyBackup: string | null;
  }> = [];

  /*
   * T41_CHECKPOINT_SAFETY_SNAPSHOT_V1
   *
   * Primero se captura TODO el estado actual.
   * No comienza ninguna restauración hasta que
   * este snapshot haya terminado correctamente.
   */
  for (const entry of checkpointEntries) {
    const relative =
      String(
        entry?.path || ""
      ).trim();

    const target =
      String(
        entry?.target || ""
      ).trim();

    if (!relative || !target) {
      throw new Error(
        "ROLLBACK_CHECKPOINT_ENTRY_INVALID_AT_EXECUTION"
      );
    }

    const existedBefore =
      fs.existsSync(target);

    let safetyBackup:
      string | null =
      null;

    if (existedBefore) {
      const stat =
        fs.lstatSync(target);

      if (
        stat.isSymbolicLink() ||
        !stat.isFile()
      ) {
        throw new Error(
          `ROLLBACK_CHECKPOINT_CURRENT_TARGET_NOT_REGULAR_FILE:${relative}`
        );
      }

      safetyBackup =
        path.join(
          safetyRoot,
          crypto
            .createHash("sha256")
            .update(relative)
            .digest("hex")
        );

      copyFileWithDirs(
        target,
        safetyBackup
      );
    }

    safetyEntries.push({
      path: relative,
      target,
      existedBefore,
      safetyBackup,
    });
  }

  const restored: string[] = [];

  try {
    for (const entry of checkpointEntries) {
      if (entry.existed === true) {
        copyFileWithDirs(
          entry.backupAbsolute,
          entry.target
        );
      } else if (
        fs.existsSync(
          entry.target
        )
      ) {
        const stat =
          fs.lstatSync(
            entry.target
          );

        if (
          stat.isSymbolicLink() ||
          !stat.isFile()
        ) {
          throw new Error(
            `ROLLBACK_CHECKPOINT_TARGET_NOT_REGULAR_FILE:${entry.path}`
          );
        }

        fs.rmSync(
          entry.target,
          {
            force: true,
          }
        );
      }

      restored.push(
        entry.path
      );
    }

    return {
      ok: true,
      restored,
      safetyRoot:
        path.relative(
          ROOT,
          safetyRoot
        ),
    };
  } catch (restoreError: any) {
    const recoveryErrors: string[] =
      [];

    /*
     * Si la restauración falla parcialmente,
     * recuperar el snapshot tomado antes de
     * comenzar el rollback.
     */
    for (const safety of safetyEntries) {
      try {
        if (
          safety.existedBefore
        ) {
          if (
            !safety.safetyBackup ||
            !fs.existsSync(
              safety.safetyBackup
            )
          ) {
            throw new Error(
              "SAFETY_BACKUP_MISSING"
            );
          }

          copyFileWithDirs(
            safety.safetyBackup,
            safety.target
          );
        } else if (
          fs.existsSync(
            safety.target
          )
        ) {
          const stat =
            fs.lstatSync(
              safety.target
            );

          if (
            stat.isSymbolicLink() ||
            !stat.isFile()
          ) {
            throw new Error(
              "SAFETY_RECOVERY_TARGET_NOT_REGULAR_FILE"
            );
          }

          fs.rmSync(
            safety.target,
            {
              force: true,
            }
          );
        }
      } catch (recoveryError: any) {
        recoveryErrors.push(
          `${safety.path}:${
            recoveryError?.message ||
            String(
              recoveryError
            )
          }`
        );
      }
    }

    const error: any =
      new Error(
        recoveryErrors.length === 0
          ? "ROLLBACK_CHECKPOINT_RESTORE_FAILED_RECOVERED"
          : "ROLLBACK_CHECKPOINT_RESTORE_FAILED_RECOVERY_FAILED"
      );

    error.restoreError =
      restoreError?.message ||
      String(restoreError);

    error.recoveryErrors =
      recoveryErrors;

    throw error;
  }
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

    const checkpointIdInput = String(
      body?.checkpointId || ""
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

      /*
       * Rollback restaura archivos y posteriormente
       * ejecuta npm run build.
       *
       * Son dos capacidades reales distintas:
       *
       *   rollback       -> restauración
       *   modify_runtime -> build
       *
       * Ambas deben estar autorizadas antes de comenzar
       * cualquier mutación.
       */
      const buildAuthorization =
        authorizeKairosExecution(
          req,
          "modify_runtime"
        );

      if (!buildAuthorization.ok) {
        return NextResponse.json(
          {
            ok: false,
            mode:
              "ROLLBACK_BUILD_AUTHORIZATION_BLOCKED",
            rollbackId,
            stage:
              "build_authorization",
            action:
              buildAuthorization.action,
            error:
              buildAuthorization.error,
            executeRequired: true,
            message:
              "Rollback autorizado, pero falta autorización para modificar runtime/build.",
          },
          {
            status:
              buildAuthorization.status,
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

    if (
      checkpointIdInput &&
      backupRootInput
    ) {
      return NextResponse.json(
        {
          ok: false,
          rollbackId,
          error:
            "ROLLBACK_MODE_AMBIGUOUS",
          message:
            "Use checkpointId o backupRoot, no ambos.",
        },
        {
          status: 400,
        }
      );
    }

    if (checkpointIdInput) {
      const checkpoint =
        readDeployCheckpointManifest(
          checkpointIdInput
        );

      if (
        proposalId &&
        checkpoint.manifest.proposalId !==
          proposalId
      ) {
        return NextResponse.json(
          {
            ok: false,
            rollbackId,
            mode:
              "ROLLBACK_CHECKPOINT_PROPOSAL_MISMATCH",
            error:
              "ROLLBACK_CHECKPOINT_PROPOSAL_MISMATCH",
            checkpointId:
              checkpoint.checkpointId,
            proposalId,
            checkpointProposalId:
              checkpoint.manifest.proposalId,
          },
          {
            status: 409,
          }
        );
      }

      const checkpointEntries =
        [
          ...checkpoint.files,
          ...checkpoint.registries,
        ];

      const preview =
        checkpointEntries.map(
          (entry) => ({
            path:
              entry.path,
            existedBefore:
              entry.existed,
            targetExistsNow:
              fs.existsSync(
                entry.target
              ),
            backupVerified:
              entry.existed
                ? true
                : null,
          })
        );

      if (!execute) {
        return NextResponse.json({
          ok: true,
          mode:
            "ROLLBACK_CHECKPOINT_DRY_RUN",
          rollbackId,
          checkpointId:
            checkpoint.checkpointId,
          proposalId:
            checkpoint.manifest.proposalId,
          executeRequired: true,
          filesCount:
            checkpoint.files.length,
          registriesCount:
            checkpoint.registries.length,
          totalEntries:
            checkpointEntries.length,
          integrityVerified: true,
          runtimeDataSensitive:
            checkpoint.runtimeDataSensitive,
          runtimeDataPaths:
            checkpoint.runtimeDataPaths,
          files:
            preview,
          message:
            "Checkpoint validado. No se modificó ningún archivo.",
        });
      }

      if (
        checkpoint.runtimeDataSensitive
      ) {
        return NextResponse.json(
          {
            ok: false,
            mode:
              "ROLLBACK_CHECKPOINT_RUNTIME_DATA_BLOCKED",
            rollbackId,
            checkpointId:
              checkpoint.checkpointId,
            proposalId:
              checkpoint.manifest.proposalId,
            runtimeDataSensitive:
              true,
            runtimeDataPaths:
              checkpoint.runtimeDataPaths,
            error:
              "ROLLBACK_CHECKPOINT_RUNTIME_DATA_BLOCKED",
            message:
              "Rollback automático bloqueado porque el checkpoint incluye datos vivos bajo data/.",
          },
          {
            status: 409,
          }
        );
      }

      /*
       * T41_POST_CORE_PROPOSAL_COMPENSATION_V1
       *
       * La proposal se bloquea históricamente ANTES
       * de restaurar el filesystem.
       *
       * No revierte el lifecycle "applied".
       * Solo registra compensación fail-closed para
       * impedir un Publish posterior de una proposal
       * cuya materialización será restaurada.
       */
      const compensationStartedAt =
        new Date().toISOString();

      const compensatedProposal =
        await patchProposalMetadata(
          checkpoint.manifest.proposalId,
          {
            rollback_compensated:
              true,
            rollback_checkpoint_id:
              checkpoint.checkpointId,
            rollback_scope:
              "post_core_recovery",
            rollback_reason:
              "production_smoke_failed",
            rollback_started_at:
              compensationStartedAt,
            filesystem_state:
              "recovery_pending",
          }
        );

      if (!compensatedProposal) {
        return NextResponse.json(
          {
            ok: false,
            mode:
              "ROLLBACK_CHECKPOINT_PROPOSAL_COMPENSATION_FAILED",
            rollbackId,
            checkpointId:
              checkpoint.checkpointId,
            proposalId:
              checkpoint.manifest.proposalId,
            error:
              "ROLLBACK_CHECKPOINT_PROPOSAL_COMPENSATION_FAILED",
          },
          {
            status: 409,
          }
        );
      }

      const safetyRoot =
        path.join(
          PRE_ROLLBACK_DIR,
          `${rollbackId}-checkpoint`
        );

      const restoreResult =
        restoreCheckpointEntriesSafely(
          checkpointEntries,
          safetyRoot
        );

      const compensationCompletedAt =
        new Date().toISOString();

      const completedCompensation =
        await patchProposalMetadata(
          checkpoint.manifest.proposalId,
          {
            rollback_compensated:
              true,
            rollback_checkpoint_id:
              checkpoint.checkpointId,
            rollback_scope:
              "post_core_recovery",
            rollback_reason:
              "production_smoke_failed",
            rollback_compensated_at:
              compensationCompletedAt,
            filesystem_state:
              "restored_pre_apply",
          }
        );

      if (!completedCompensation) {
        return NextResponse.json(
          {
            ok: false,
            mode:
              "ROLLBACK_CHECKPOINT_COMPENSATION_FINALIZE_FAILED",
            rollbackId,
            checkpointId:
              checkpoint.checkpointId,
            proposalId:
              checkpoint.manifest.proposalId,
            error:
              "ROLLBACK_CHECKPOINT_COMPENSATION_FINALIZE_FAILED",
            filesystemRestored:
              true,
            proposalBlocked:
              true,
          },
          {
            status: 500,
          }
        );
      }

      const successRecord = {
        id:
          rollbackId,
        mode:
          "ROLLBACK_CHECKPOINT_APPLIED",
        ok:
          true,
        checkpointId:
          checkpoint.checkpointId,
        proposalId:
          checkpoint.manifest.proposalId,
        branch,
        filesCount:
          checkpoint.files.length,
        registriesCount:
          checkpoint.registries.length,
        totalEntries:
          checkpointEntries.length,
        runtimeDataSensitive:
          false,
        runtimeDataPaths:
          [],
        integrityVerified:
          true,
        restore:
          restoreResult,
        safetyRoot:
          path.relative(
            ROOT,
            safetyRoot
          ),
        frontendRollbackPending:
          true,
        restartPending:
          true,
        smokeTestPending:
          true,
        createdAt:
          new Date().toISOString(),
        durationMs:
          Date.now() - startedAt,
      };

      writeHistory(
        successRecord
      );

      return NextResponse.json({
        ...successRecord,
        message:
          "Checkpoint restaurado. La recuperación del Front anterior y los reinicios permanecen pendientes.",
      });
    }

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
     * FRONTERA ENTRE ROLLBACK Y DEPLOY
     *
     * El rollback ya restauró los archivos y validó
     * que el proyecto compila. No reinicia procesos ni
     * publica automáticamente.
     *
     * El deploy permanece como una acción soberana
     * independiente que exige su propia autorización.
     */
    const deploy = {
      ok: true,
      pending: true,
      executed: false,
      action: "deploy",
      endpoint:
        "/api/ora/system/deploy",
      kairosGateRequired: true,
      message:
        "Rollback validado. El deploy debe autorizarse y ejecutarse por separado.",
    };

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
      deployPending: true,
      smokeTestPending: true,
      createdAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
    };

    writeHistory(successRecord);

    return NextResponse.json({
      ...successRecord,
      message:
        "Rollback restaurado y build validado. El deploy soberano queda pendiente de autorización separada.",
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
