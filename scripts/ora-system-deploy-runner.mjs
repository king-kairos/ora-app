import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  spawn,
  spawnSync,
} from "child_process";

const ROOT =
  process.cwd();

const STATE_DIR =
  String(
    process.env.ORA_DEPLOY_STATE_DIR ||
      path.join(
        ROOT,
        "data",
        "system-deploy"
      )
  ).trim();

const deployId =
  String(
    process.argv[2] || ""
  ).trim();

if (
  !/^deploy-\d+-[a-f0-9]{12}$/.test(
    deployId
  )
) {
  console.error(
    "INVALID_DEPLOY_ID"
  );
  process.exit(2);
}

const STATE_FILE =
  path.join(
    STATE_DIR,
    `${deployId}.json`
  );

function now() {
  return new Date().toISOString();
}

function readState() {
  try {
    return JSON.parse(
      fs.readFileSync(
        STATE_FILE,
        "utf8"
      )
    );
  } catch {
    return {
      deployId,
    };
  }
}

function writeState(
  patch
) {
  fs.mkdirSync(
    STATE_DIR,
    {
      recursive: true,
    }
  );

  const current =
    readState();

  const next = {
    ...current,
    ...patch,
    deployId,
    updatedAt:
      now(),
  };

  const temporary =
    `${STATE_FILE}.${process.pid}.tmp`;

  fs.writeFileSync(
    temporary,
    JSON.stringify(
      next,
      null,
      2
    ),
    "utf8"
  );

  fs.renameSync(
    temporary,
    STATE_FILE
  );

  return next;
}

function tail(
  value,
  limit = 10000
) {
  return String(
    value || ""
  ).slice(-limit);
}

function run(
  command,
  args
) {
  const result =
    spawnSync(
      command,
      args,
      {
        cwd:
          ROOT,
        env:
          process.env,
        encoding:
          "utf8",
        maxBuffer:
          25 * 1024 * 1024,
      }
    );

  const exitCode =
    typeof result.status ===
    "number"
      ? result.status
      : 1;

  return {
    ok:
      exitCode === 0 &&
      !result.error,
    exitCode,
    signal:
      result.signal || null,
    stdout:
      tail(result.stdout),
    stderr:
      tail(
        result.stderr ||
        result.error?.message ||
        ""
      ),
  };
}

function computeArtifactDigest(
  rootDir
) {
  const hash =
    crypto.createHash("sha256");

  function walk(
    currentDir
  ) {
    const entries =
      fs.readdirSync(
        currentDir,
        {
          withFileTypes: true,
        }
      ).sort(
        (a, b) =>
          a.name === b.name
            ? 0
            : a.name < b.name
              ? -1
              : 1
      );

    for (const entry of entries) {
      const fullPath =
        path.join(
          currentDir,
          entry.name
        );

      const relativePath =
        path
          .relative(
            rootDir,
            fullPath
          )
          .split(path.sep)
          .join("/");

      if (
        relativePath ===
        ".ora-validated-artifact.json"
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isSymbolicLink()) {
        hash.update(
          `L:${relativePath}\0`,
          "utf8"
        );
        hash.update(
          fs.readlinkSync(fullPath),
          "utf8"
        );
        hash.update("\0");
        continue;
      }

      if (entry.isFile()) {
        hash.update(
          `F:${relativePath}\0`,
          "utf8"
        );
        hash.update(
          fs.readFileSync(fullPath)
        );
        hash.update("\0");
      }
    }
  }

  walk(rootDir);

  return hash.digest("hex");
}

const VALIDATED_ROOT =
  path.join(
    ROOT,
    ".next-validated"
  );

function verifyValidatedArtifact(
  state
) {
  const artifactId =
    String(
      state?.artifactId || ""
    ).trim();

  const expectedBuildId =
    String(
      state?.buildId || ""
    ).trim();

  const expectedArtifactDigest =
    String(
      state?.artifactDigest || ""
    ).trim();

  if (
    !/^validated-\d+-[a-f0-9]{12}$/.test(
      artifactId
    ) ||
    !expectedBuildId ||
    !/^[a-f0-9]{64}$/.test(
      expectedArtifactDigest
    )
  ) {
    return {
      ok: false,
      error:
        "VALIDATED_ARTIFACT_IDENTITY_INVALID",
    };
  }

  const artifactDir =
    path.join(
      VALIDATED_ROOT,
      artifactId
    );

  const buildIdFile =
    path.join(
      artifactDir,
      "BUILD_ID"
    );

  const metadataFile =
    path.join(
      artifactDir,
      ".ora-validated-artifact.json"
    );

  if (
    !fs.existsSync(buildIdFile) ||
    !fs.existsSync(metadataFile)
  ) {
    return {
      ok: false,
      error:
        "VALIDATED_ARTIFACT_FILES_MISSING",
    };
  }

  try {
    const physicalBuildId =
      String(
        fs.readFileSync(
          buildIdFile,
          "utf8"
        )
      ).trim();

    const metadata =
      JSON.parse(
        fs.readFileSync(
          metadataFile,
          "utf8"
        )
      );

    const physicalArtifactDigest =
      computeArtifactDigest(
        artifactDir
      );

    const identityMatches =
      metadata?.artifactId ===
        artifactId &&
      metadata?.buildId ===
        expectedBuildId &&
      metadata?.artifactDigest ===
        expectedArtifactDigest &&
      physicalBuildId ===
        expectedBuildId &&
      physicalArtifactDigest ===
        expectedArtifactDigest &&
      (metadata?.proposalId ||
        null) ===
        (state?.proposalId ||
          null) &&
      (metadata?.branch ||
        null) ===
        (state?.branch ||
          null);

    if (!identityMatches) {
      return {
        ok: false,
        error:
          "VALIDATED_ARTIFACT_IDENTITY_MISMATCH",
      };
    }

    return {
      ok: true,
      artifactId,
      buildId:
        physicalBuildId,
      artifactDigest:
        physicalArtifactDigest,
      artifactDir,
    };
  } catch {
    return {
      ok: false,
      error:
        "VALIDATED_ARTIFACT_METADATA_INVALID",
    };
  }
}

function restorePromotionBackup(
  backupDir
) {
  const liveDir =
    path.join(ROOT, ".next");

  if (!backupDir) {
    return {
      ok: false,
      restored: false,
      error:
        "PROMOTION_BACKUP_NOT_CONFIGURED",
    };
  }

  try {
    if (
      !fs.existsSync(
        backupDir
      )
    ) {
      return {
        ok: false,
        restored: false,
        error:
          "PROMOTION_BACKUP_MISSING",
      };
    }

    if (fs.existsSync(liveDir)) {
      fs.rmSync(
        liveDir,
        {
          recursive: true,
          force: true,
        }
      );
    }

    fs.renameSync(
      backupDir,
      liveDir
    );

    return {
      ok: true,
      restored: true,
    };
  } catch (error) {
    return {
      ok: false,
      restored: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

function fail(
  stage,
  error,
  extra = {}
) {
  writeState({
    status:
      "failed",
    stage:
      "failed",
    failedStage:
      stage,
    completedAt:
      now(),
    error:
      String(
        error ||
        "DEPLOY_FAILED"
      ),
    ...extra,
  });

  process.exitCode = 1;
}

let promotionBackupDir = null;

try {
  const initialState =
    readState();

  const isSafePublish =
    String(
      initialState?.source || ""
    ).trim() ===
      "safe-publish-automatic";

  let verifiedArtifact = null;

  if (isSafePublish) {
    verifiedArtifact =
      verifyValidatedArtifact(
        initialState
      );

    writeState({
      validatedArtifact:
        verifiedArtifact,
    });

    if (!verifiedArtifact.ok) {
      fail(
        "validated_artifact",
        verifiedArtifact.error,
        {
          validatedArtifact:
            verifiedArtifact,
        }
      );

      process.exit(1);
    }
  }

  writeState({
    status:
      "running",
    stage:
      isSafePublish
        ? "promoting_validated_artifact"
        : "building",
    startedAt:
      now(),
    error:
      null,
  });

  let build;

  if (isSafePublish) {
    const liveDir =
      path.join(ROOT, ".next");

    const backupDir =
      path.join(
        ROOT,
        `.next-pre-promote-${deployId}`
      );

    promotionBackupDir =
      backupDir;

    try {
      fs.rmSync(
        backupDir,
        {
          recursive: true,
          force: true,
        }
      );

      if (fs.existsSync(liveDir)) {
        fs.renameSync(
          liveDir,
          backupDir
        );
      }

      fs.renameSync(
        verifiedArtifact.artifactDir,
        liveDir
      );

      build = {
        ok: true,
        mode:
          "VALIDATED_ARTIFACT_PROMOTION",
        artifactId:
          verifiedArtifact.artifactId,
        buildId:
          verifiedArtifact.buildId,
        backupDir,
      };
    } catch (error) {
      try {
        if (
          !fs.existsSync(liveDir) &&
          fs.existsSync(backupDir)
        ) {
          fs.renameSync(
            backupDir,
            liveDir
          );
        }
      } catch {}

      build = {
        ok: false,
        mode:
          "VALIDATED_ARTIFACT_PROMOTION",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  } else {
    build =
      run(
        "npm",
        [
          "run",
          "build",
        ]
      );
  }

  writeState({
    build,
  });

  if (!build.ok) {
    fail(
      isSafePublish
        ? "promoting_validated_artifact"
        : "building",
      isSafePublish
        ? "VALIDATED_ARTIFACT_PROMOTION_FAILED"
        : "DEPLOY_BUILD_FAILED",
      {
        build,
      }
    );

    process.exit(1);
  } else {
    writeState({
      status:
        "running",
      stage:
        "restarting_front",
    });

    const restartFront =
      run(
        "pm2",
        [
          "restart",
          "ora-front",
          "--update-env",
        ]
      );

    writeState({
      restartFront,
    });

    if (!restartFront.ok) {
      const rollback =
        isSafePublish
          ? restorePromotionBackup(
              promotionBackupDir
            )
          : null;

      const rollbackRestartFront =
        rollback?.ok === true
          ? run(
              "pm2",
              [
                "restart",
                "ora-front",
                "--update-env",
              ]
            )
          : null;

      fail(
        "restarting_front",
        "DEPLOY_RESTART_FRONT_FAILED",
        {
          restartFront,
          rollback,
          rollbackRestartFront,
        }
      );

      process.exit(1);
    } else {
      /*
       * RESTART_CORE HANDOFF
       *
       * PM2 tiene treekill=true para ORA.
       * Si este runner ejecuta directamente
       * "pm2 restart ora", PM2 mata también
       * este proceso antes de que pueda escribir
       * restartCore/succeeded.
       *
       * El último paso se entrega a un finalizer
       * detached. El finalizer espera a que este
       * runner termine y quede fuera del árbol
       * de ORA antes de reiniciar el Core.
       */
      writeState({
        status:
          "running",
        stage:
          "restart_core_handoff",
      });

      const finalizer =
        spawn(
          process.execPath,
          [
            path.join(
              ROOT,
              "scripts",
              "ora-system-deploy-finalizer.mjs"
            ),
            deployId,
          ],
          {
            cwd:
              ROOT,
            env:
              process.env,
            detached:
              true,
            stdio:
              "ignore",
          }
        );

      finalizer.unref();

      if (!finalizer.pid) {
        const rollback =
          isSafePublish
            ? restorePromotionBackup(
                promotionBackupDir
              )
            : null;

        const rollbackRestartFront =
          rollback?.ok === true
            ? run(
                "pm2",
                [
                  "restart",
                  "ora-front",
                  "--update-env",
                ]
              )
            : null;

        fail(
          "restart_core_handoff",
          "DEPLOY_FINALIZER_PID_MISSING",
          {
            rollback,
            rollbackRestartFront,
          }
        );

        process.exit(1);
      } else {
        writeState({
          status:
            "running",
          stage:
            "restart_core_handoff",
          finalizerPid:
            finalizer.pid,
          handoffAt:
            now(),
        });
      }
    }
  }
} catch (error) {
  const rollback =
    promotionBackupDir
      ? restorePromotionBackup(
          promotionBackupDir
        )
      : null;

  const rollbackRestartFront =
    rollback?.ok === true
      ? run(
          "pm2",
          [
            "restart",
            "ora-front",
            "--update-env",
          ]
        )
      : null;

  fail(
    "runner",
    error instanceof Error
      ? error.message
      : String(error),
    {
      rollback,
      rollbackRestartFront,
    }
  );
}
