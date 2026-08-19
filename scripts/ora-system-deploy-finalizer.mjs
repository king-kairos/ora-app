import fs from "fs";
import path from "path";
import {
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

function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(resolve, ms)
  );
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

function writeState(patch) {
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

/*
 * SAFE_PUBLISH_PERSISTENT_FINALIZATION_V2
 *
 * El finalizer vive fuera de ora-front y ora.
 * Puede completar la validación aun después
 * de ambos reinicios.
 */

const SAFE_PUBLISH_SOURCE =
  "safe-publish-automatic";

const FRONT_BASE =
  String(
    process.env
      .ORA_FRONT_INTERNAL_BASE_URL ||
    "http://127.0.0.1:3000"
  )
    .trim()
    .replace(/\/+$/, "");

const SMOKE_MAX_ATTEMPTS =
  30;

const SMOKE_RETRY_MS =
  1000;

function validatePromotionBackup(
  state
) {
  const expectedBackupDir =
    path.join(
      ROOT,
      `.next-pre-promote-${deployId}`
    );

  const stateBackupDir =
    String(
      state?.build?.backupDir || ""
    ).trim();

  if (
    !stateBackupDir ||
    path.resolve(
      stateBackupDir
    ) !==
      path.resolve(
        expectedBackupDir
      )
  ) {
    return {
      ok: false,
      error:
        "RECOVERY_FRONT_BACKUP_IDENTITY_INVALID",
    };
  }

  if (
    !fs.existsSync(
      expectedBackupDir
    )
  ) {
    return {
      ok: false,
      error:
        "RECOVERY_FRONT_BACKUP_MISSING",
    };
  }

  let stat;

  try {
    stat =
      fs.lstatSync(
        expectedBackupDir
      );
  } catch {
    return {
      ok: false,
      error:
        "RECOVERY_FRONT_BACKUP_STAT_FAILED",
    };
  }

  if (
    stat.isSymbolicLink() ||
    !stat.isDirectory()
  ) {
    return {
      ok: false,
      error:
        "RECOVERY_FRONT_BACKUP_NOT_DIRECTORY",
    };
  }

  return {
    ok: true,
    backupDir:
      expectedBackupDir,
    relativeBackupDir:
      path.relative(
        ROOT,
        expectedBackupDir
      ),
  };
}

function restorePreviousFrontSafely(
  backupValidation
) {
  if (
    backupValidation?.ok !== true ||
    !backupValidation?.backupDir
  ) {
    return {
      ok: false,
      restored: false,
      error:
        "RECOVERY_FRONT_BACKUP_NOT_VALIDATED",
    };
  }

  const liveDir =
    path.join(
      ROOT,
      ".next"
    );

  const backupDir =
    String(
      backupValidation.backupDir
    ).trim();

  const failedFrontDir =
    path.join(
      ROOT,
      `.next-post-failed-deploy-${deployId}`
    );

  try {
    if (
      fs.existsSync(
        failedFrontDir
      )
    ) {
      return {
        ok: false,
        restored: false,
        error:
          "RECOVERY_FAILED_FRONT_SNAPSHOT_ALREADY_EXISTS",
      };
    }

    if (
      fs.existsSync(
        liveDir
      )
    ) {
      const liveStat =
        fs.lstatSync(
          liveDir
        );

      if (
        liveStat.isSymbolicLink() ||
        !liveStat.isDirectory()
      ) {
        return {
          ok: false,
          restored: false,
          error:
            "RECOVERY_LIVE_FRONT_NOT_DIRECTORY",
        };
      }

      fs.renameSync(
        liveDir,
        failedFrontDir
      );
    }

    try {
      fs.renameSync(
        backupDir,
        liveDir
      );
    } catch (promotionError) {
      if (
        !fs.existsSync(
          liveDir
        ) &&
        fs.existsSync(
          failedFrontDir
        )
      ) {
        fs.renameSync(
          failedFrontDir,
          liveDir
        );
      }

      return {
        ok: false,
        restored: false,
        error:
          "RECOVERY_PREVIOUS_FRONT_RESTORE_FAILED",
        detail:
          promotionError instanceof Error
            ? promotionError.message
            : String(
                promotionError
              ),
      };
    }

    return {
      ok: true,
      restored: true,
      backupConsumed:
        true,
      failedFrontSnapshot:
        fs.existsSync(
          failedFrontDir
        )
          ? path.relative(
              ROOT,
              failedFrontDir
            )
          : null,
      liveDir:
        path.relative(
          ROOT,
          liveDir
        ),
    };
  } catch (error) {
    return {
      ok: false,
      restored: false,
      error:
        "RECOVERY_FRONT_TRANSACTION_FAILED",
      detail:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

function validateRecoveryAuthorization(
  state
) {
  const proposalId =
    String(
      state?.proposalId || ""
    ).trim();

  const rollbackCheckpointId =
    String(
      state?.rollbackCheckpointId || ""
    ).trim();

  const authorization =
    state?.recoveryAuthorization;

  const requiredActions = [
    "rollback",
    "modify_runtime",
    "restart_front",
    "restart_core",
  ];

  if (
    !proposalId ||
    !/^checkpoint-\d+-[a-f0-9]{12}$/.test(
      rollbackCheckpointId
    ) ||
    authorization?.ok !== true ||
    String(
      authorization?.proposalId || ""
    ).trim() !== proposalId ||
    String(
      authorization?.rollbackCheckpointId ||
      ""
    ).trim() !== rollbackCheckpointId
  ) {
    return {
      ok: false,
      error:
        "RECOVERY_AUTHORIZATION_IDENTITY_INVALID",
    };
  }

  for (const action of requiredActions) {
    const evidence =
      authorization?.actions?.[action];

    if (
      evidence?.ok !== true ||
      evidence?.action !== action ||
      evidence?.authorizedBy !==
        "KAIROS_SEAL"
    ) {
      return {
        ok: false,
        error:
          `RECOVERY_AUTHORIZATION_ACTION_INVALID:${action}`,
      };
    }
  }

  return {
    ok: true,
    proposalId,
    rollbackCheckpointId,
    actions:
      requiredActions,
  };
}

async function readJsonResponse(
  response
) {
  const text =
    await response.text();

  try {
    return text
      ? JSON.parse(text)
      : {};
  } catch {
    return {
      raw:
        text,
    };
  }
}

async function runCheckpointRecovery(
  state
) {
  const seal =
    String(
      process.env
        .KAIROS_SEAL ||
      ""
    ).trim();

  if (!seal) {
    return {
      ok: false,
      status: 0,
      data: {
        ok: false,
        error:
          "KAIROS_SEAL_MISSING_IN_RECOVERY",
      },
    };
  }

  const proposalId =
    String(
      state?.proposalId || ""
    ).trim();

  const checkpointId =
    String(
      state?.rollbackCheckpointId || ""
    ).trim();

  const branch =
    String(
      state?.branch || ""
    ).trim();

  if (
    !proposalId ||
    !/^checkpoint-\d+-[a-f0-9]{12}$/.test(
      checkpointId
    )
  ) {
    return {
      ok: false,
      status: 0,
      data: {
        ok: false,
        error:
          "RECOVERY_CHECKPOINT_IDENTITY_INVALID",
      },
    };
  }

  try {
    const response =
      await fetch(
        `${FRONT_BASE}/api/kairos/autoprog/rollback`,
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json",
            "x-kairos-seal":
              seal,
          },
          body:
            JSON.stringify({
              checkpointId,
              proposalId,
              branch:
                branch || null,
              execute:
                true,
            }),
        }
      );

    const data =
      await readJsonResponse(
        response
      );

    return {
      ok:
        response.ok &&
        data?.ok === true &&
        data?.mode ===
          "ROLLBACK_CHECKPOINT_APPLIED",
      status:
        response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: {
        ok: false,
        error:
          "RECOVERY_CHECKPOINT_REQUEST_FAILED",
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
    };
  }
}

async function restorePostCoreState(
  state,
  recoveryValidation,
  frontBackupValidation
) {
  if (
    recoveryValidation?.ok !== true ||
    frontBackupValidation?.ok !== true
  ) {
    return {
      ok: false,
      stage:
        "preconditions",
      error:
        "POST_CORE_RECOVERY_PRECONDITIONS_FAILED",
      checkpointRecovery:
        null,
      frontRecovery:
        null,
    };
  }

  const checkpointRecovery =
    await runCheckpointRecovery(
      state
    );

  if (
    checkpointRecovery?.ok !== true
  ) {
    return {
      ok: false,
      stage:
        "checkpoint",
      error:
        "POST_CORE_CHECKPOINT_RECOVERY_FAILED",
      checkpointRecovery,
      frontRecovery:
        null,
    };
  }

  const frontRecovery =
    restorePreviousFrontSafely(
      frontBackupValidation
    );

  if (
    frontRecovery?.ok !== true
  ) {
    return {
      ok: false,
      stage:
        "front",
      error:
        "POST_CORE_FRONT_RECOVERY_FAILED",
      checkpointRecovery,
      frontRecovery,
    };
  }

  const recoveryRestartFront =
    run(
      "pm2",
      [
        "restart",
        "ora-front",
        "--update-env",
      ]
    );

  if (
    recoveryRestartFront?.ok !== true
  ) {
    return {
      ok: false,
      stage:
        "restart_front",
      error:
        "POST_CORE_RECOVERY_RESTART_FRONT_FAILED",
      checkpointRecovery,
      frontRecovery,
      recoveryRestartFront,
      recoveryRestartCore:
        null,
      recoverySmoke:
        null,
    };
  }

  const recoveryRestartCore =
    run(
      "pm2",
      [
        "restart",
        "ora",
        "--update-env",
      ]
    );

  if (
    recoveryRestartCore?.ok !== true
  ) {
    return {
      ok: false,
      stage:
        "restart_core",
      error:
        "POST_CORE_RECOVERY_RESTART_CORE_FAILED",
      checkpointRecovery,
      frontRecovery,
      recoveryRestartFront,
      recoveryRestartCore,
      recoverySmoke:
        null,
    };
  }

  const recoverySmoke =
    await runSafePublishSmoke(
      state
    );

  const recoverySmokePassed =
    recoverySmoke?.ok === true &&
    recoverySmoke?.data?.ok === true;

  if (!recoverySmokePassed) {
    return {
      ok: false,
      stage:
        "recovery_smoke",
      error:
        "POST_CORE_RECOVERY_SMOKE_FAILED",
      checkpointRecovery,
      frontRecovery,
      recoveryRestartFront,
      recoveryRestartCore,
      recoverySmoke,
    };
  }

  return {
    ok: true,
    stage:
      "recovered",
    checkpointRecovery,
    frontRecovery,
    recoveryRestartFront,
    recoveryRestartCore,
    recoverySmoke,
    recoveredAt:
      now(),
  };
}

async function runSafePublishSmoke(
  state
) {
  const seal =
    String(
      process.env
        .KAIROS_SEAL ||
      ""
    ).trim();

  if (!seal) {
    return {
      ok: false,
      attemptsUsed: 0,
      attempts: [],
      data: {
        ok: false,
        error:
          "KAIROS_SEAL_MISSING_IN_FINALIZER",
      },
    };
  }

  const branch =
    String(
      state?.branch ||
      ""
    ).trim();

  const proposalId =
    String(
      state?.proposalId ||
      ""
    ).trim();

  if (
    !branch ||
    !proposalId
  ) {
    return {
      ok: false,
      attemptsUsed: 0,
      attempts: [],
      data: {
        ok: false,
        error:
          "SAFE_PUBLISH_STATE_METADATA_MISSING",
      },
    };
  }

  const attempts =
    [];

  for (
    let attempt = 1;
    attempt <=
      SMOKE_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const response =
        await fetch(
          `${FRONT_BASE}/api/kairos/autoprog/smoke-test`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-kairos-seal":
                seal,
            },
            body:
              JSON.stringify({
                branch,
                proposalId,
              }),
          }
        );

      const data =
        await readJsonResponse(
          response
        );

      const ok =
        response.ok &&
        data?.ok === true;

      attempts.push({
        attempt,
        httpStatus:
          response.status,
        ok,
      });

      if (ok) {
        return {
          ok: true,
          attemptsUsed:
            attempt,
          attempts,
          data,
        };
      }
    } catch (error) {
      attempts.push({
        attempt,
        httpStatus:
          null,
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }

    if (
      attempt <
      SMOKE_MAX_ATTEMPTS
    ) {
      await sleep(
        SMOKE_RETRY_MS
      );
    }
  }

  return {
    ok: false,
    attemptsUsed:
      attempts.length,
    attempts,
    data: {
      ok: false,
      error:
        "SMOKE_TEST_RETRIES_EXHAUSTED",
    },
  };
}

async function recordSafePublishHistory(
  state,
  smoke,
  deploySnapshot
) {
  const seal =
    String(
      process.env
        .KAIROS_SEAL ||
      ""
    ).trim();

  if (!seal) {
    return {
      ok: false,
      status: 0,
      data: {
        error:
          "KAIROS_SEAL_MISSING_IN_FINALIZER",
      },
    };
  }

  try {
    const response =
      await fetch(
        `${FRONT_BASE}/api/kairos/autoprog/deploy-history`,
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json",
            "x-kairos-seal":
              seal,
          },
          body:
            JSON.stringify({
              proposalId:
                state?.proposalId ||
                null,
              branch:
                state?.branch ||
                null,
              buildPassed:
                true,
              deploy:
                deploySnapshot,
              smokeTest: {
                ...(smoke?.data ||
                  {}),
                retries: {
                  attemptsUsed:
                    smoke
                      ?.attemptsUsed ||
                    0,
                  attempts:
                    smoke
                      ?.attempts ||
                    [],
                },
              },
              smokePassed:
                smoke?.ok === true &&
                smoke?.data?.ok ===
                  true,
              source:
                "safe-publish-persistent-handoff-v2",
            }),
        }
      );

    return {
      ok:
        response.ok,
      status:
        response.status,
      data:
        await readJsonResponse(
          response
        ),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
    };
  }
}

async function recordPostCoreRecoveryHistory(
  state,
  recovery,
  rollbackSucceeded
) {
  const seal =
    String(
      process.env
        .KAIROS_SEAL ||
      ""
    ).trim();

  if (!seal) {
    return {
      ok: false,
      status: 0,
      data: {
        error:
          "KAIROS_SEAL_MISSING_IN_FINALIZER",
      },
    };
  }

  try {
    const response =
      await fetch(
        `${FRONT_BASE}/api/kairos/autoprog/deploy-history`,
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json",
            "x-kairos-seal":
              seal,
          },
          body:
            JSON.stringify({
              proposalId:
                state?.proposalId ||
                null,
              branch:
                state?.branch ||
                null,
              buildPassed:
                true,
              eventType:
                "post_core_recovery",
              checkpointId:
                state?.rollbackCheckpointId ||
                null,
              recovery,
              rollbackSucceeded:
                rollbackSucceeded === true,
              recoveryValidated:
                recovery?.ok === true,
              deploy: {
                deployId:
                  state?.deployId ||
                  null,
                status:
                  "failed",
                stage:
                  rollbackSucceeded === true
                    ? "rolled_back"
                    : "recovery_failed",
              },
              source:
                "safe-publish-post-core-recovery-v1",
            }),
        }
      );

    return {
      ok:
        response.ok,
      status:
        response.status,
      data:
        await readJsonResponse(
          response
        ),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
    };
  }
}

async function main() {
  /*
   * El runner padre debe haber terminado antes
   * de reiniciar ORA.
   *
   * Así este proceso deja de pertenecer al árbol
   * que PM2 eliminará mediante treekill.
   */
  await sleep(2500);

  writeState({
    status:
      "running",
    stage:
      "restarting_core",
    finalizerPid:
      process.pid,
    finalizerStartedAt:
      now(),
  });

  const restartCore =
    run(
      "pm2",
      [
        "restart",
        "ora",
        "--update-env",
      ]
    );

  writeState({
    restartCore,
  });

  if (!restartCore.ok) {
    writeState({
      status:
        "failed",
      stage:
        "failed",
      failedStage:
        "restarting_core",
      completedAt:
        now(),
      error:
        "DEPLOY_RESTART_CORE_FAILED",
      restartCore,
    });

    process.exitCode = 1;
    return;
  }

  const postRestartState =
    readState();

  const isSafePublish =
    String(
      postRestartState
        ?.source ||
      ""
    ).trim() ===
      SAFE_PUBLISH_SOURCE;

  /*
   * Los deploys directos conservan exactamente
   * el contrato anterior.
   */
  if (!isSafePublish) {
    writeState({
      status:
        "succeeded",
      stage:
        "completed",
      completedAt:
        now(),
      error:
        null,
      restartCore,
    });

    return;
  }

  /*
   * Safe-Publish continúa después de que
   * ora-front y ora ya fueron reiniciados.
   */
  writeState({
    status:
      "running",
    stage:
      "validating_production",
    restartCore,
    deploySucceeded:
      true,
    productionValidated:
      false,
    error:
      null,
  });

  const smoke =
    await runSafePublishSmoke(
      readState()
    );

  const smokePassed =
    smoke?.ok === true &&
    smoke?.data?.ok === true;

  const beforeHistory =
    readState();

  const deploySnapshot = {
    deployId,
    status:
      "succeeded",
    stage:
      "deploy_completed",
    build:
      beforeHistory?.build ||
      null,
    restartFront:
      beforeHistory
        ?.restartFront ||
      null,
    restartCore,
  };

  const deployHistory =
    await recordSafePublishHistory(
      beforeHistory,
      smoke,
      deploySnapshot
    );

  if (!smokePassed) {
    const recoveryState =
      readState();

    const recoveryValidation =
      validateRecoveryAuthorization(
        recoveryState
      );

    const frontBackupValidation =
      validatePromotionBackup(
        recoveryState
      );

    const rollbackReady =
      recoveryValidation.ok === true &&
      frontBackupValidation.ok === true;

    if (!rollbackReady) {
      writeState({
        status:
          "failed",
        stage:
          "failed",
        failedStage:
          "smoke_test",
        completedAt:
          now(),
        error:
          "SAFE_PUBLISH_SMOKE_TEST_FAILED",
        restartCore,
        deploySucceeded:
          true,
        productionValidated:
          false,
        smokeTest:
          smoke,
        deployHistory,
        recoveryValidation,
        frontBackupValidation,
        recoveryAttempted:
          false,
        rollbackRecommended:
          false,
        rollbackBlocked:
          true,
      });

      return;
    }

    writeState({
      status:
        "running",
      stage:
        "recovering_post_core",
      failedStage:
        "smoke_test",
      error:
        "SAFE_PUBLISH_SMOKE_TEST_FAILED",
      deploySucceeded:
        true,
      productionValidated:
        false,
      smokeTest:
        smoke,
      deployHistory,
      recoveryValidation,
      frontBackupValidation,
      recoveryAttempted:
        true,
      rollbackRecommended:
        true,
      rollbackBlocked:
        false,
    });

    const recovery =
      await restorePostCoreState(
        recoveryState,
        recoveryValidation,
        frontBackupValidation
      );

    if (recovery?.ok !== true) {
      const postCoreRecoveryHistory =
        await recordPostCoreRecoveryHistory(
          recoveryState,
          recovery,
          false
        );

      writeState({
        status:
          "failed",
        stage:
          "recovery_failed",
        failedStage:
          recovery?.stage ||
          "post_core_recovery",
        completedAt:
          now(),
        error:
          recovery?.error ||
          "POST_CORE_RECOVERY_FAILED",
        deploySucceeded:
          true,
        productionValidated:
          false,
        recoveryAttempted:
          true,
        recovery,
        postCoreRecoveryHistory,
        rollbackSucceeded:
          false,
        recoveryValidated:
          false,
        rollbackRecommended:
          false,
        rollbackBlocked:
          false,
      });

      return;
    }

    const postCoreRecoveryHistory =
      await recordPostCoreRecoveryHistory(
        recoveryState,
        recovery,
        true
      );

    writeState({
      status:
        "failed",
      stage:
        "rolled_back",
      failedStage:
        "smoke_test",
      completedAt:
        now(),
      error:
        "SAFE_PUBLISH_SMOKE_TEST_FAILED_ROLLBACK_RECOVERED",
      deploySucceeded:
        true,
      productionValidated:
        false,
      recoveryAttempted:
        true,
      recovery,
      postCoreRecoveryHistory,
      rollbackSucceeded:
        true,
      recoveryValidated:
        true,
      rollbackRecommended:
        false,
      rollbackBlocked:
        false,
      recoveredAt:
        recovery?.recoveredAt ||
        now(),
    });

    return;
  }

  if (!deployHistory.ok) {
    writeState({
      status:
        "failed",
      stage:
        "failed",
      failedStage:
        "deploy_history",
      completedAt:
        now(),
      error:
        "SAFE_PUBLISH_DEPLOY_HISTORY_FAILED",
      restartCore,
      deploySucceeded:
        true,
      productionValidated:
        true,
      smokeTest:
        smoke,
      deployHistory,
      rollbackRecommended:
        false,
    });

    return;
  }

  writeState({
    status:
      "succeeded",
    stage:
      "completed",
    completedAt:
      now(),
    error:
      null,
    restartCore,
    deploySucceeded:
      true,
    productionValidated:
      true,
    smokeTest:
      smoke,
    deployHistory,
    rollbackRecommended:
      false,
  });
}

main().catch(
  error => {
    try {
      writeState({
        status:
          "failed",
        stage:
          "failed",
        failedStage:
          "finalizer",
        completedAt:
          now(),
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    } catch {}

    process.exitCode = 1;
  }
);
