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
      rollbackRecommended:
        true,
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
