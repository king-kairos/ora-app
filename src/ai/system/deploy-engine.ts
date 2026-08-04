import { execSync, exec } from "child_process";

function run(command: string) {
  try {
    const output = execSync(command, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
    });

    return {
      ok: true,
      command,
      output,
    };
  } catch (error: any) {
    return {
      ok: false,
      command,
      output: error?.stdout?.toString?.() || "",
      error: error?.stderr?.toString?.() || error?.message || "command failed",
    };
  }
}

function scheduleRestart() {
  exec('bash -lc "sleep 1; pm2 restart ora"', {
    cwd: process.cwd(),
  });
}

export async function runSovereignDeploy() {
  const build = run("npm run build");

  if (!build.ok) {
    return {
      ok: false,
      step: "build",
      build,
    };
  }

  scheduleRestart();

  return {
    ok: true,
    step: "scheduled-restart",
    build,
    restart: {
      ok: true,
      scheduled: true,
      command: "pm2 restart ora",
    },
  };
}
