import { execSync } from "child_process";

export function runRebuildAndRestart() {
  try {
    const buildOutput = execSync("npm run build", {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
    });

    const restartOutput = execSync("pm2 restart ora", {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
    });

    return {
      ok: true,
      buildOutput,
      restartOutput,
      message: "Build y restart ejecutados correctamente",
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Falló rebuild/restart",
      stdout: error?.stdout?.toString?.() || "",
      stderr: error?.stderr?.toString?.() || "",
    };
  }
}
