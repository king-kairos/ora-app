import fs from "fs";
import path from "path";
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

try {
  writeState({
    status:
      "running",
    stage:
      "building",
    startedAt:
      now(),
    error:
      null,
  });

  const build =
    run(
      "npm",
      [
        "run",
        "build",
      ]
    );

  writeState({
    build,
  });

  if (!build.ok) {
    fail(
      "building",
      "DEPLOY_BUILD_FAILED",
      {
        build,
      }
    );
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
      fail(
        "restarting_front",
        "DEPLOY_RESTART_FRONT_FAILED",
        {
          restartFront,
        }
      );
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
        fail(
          "restart_core_handoff",
          "DEPLOY_FINALIZER_PID_MISSING"
        );
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
  fail(
    "runner",
    error instanceof Error
      ? error.message
      : String(error)
  );
}
