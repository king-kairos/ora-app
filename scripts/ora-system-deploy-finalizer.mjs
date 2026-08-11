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
