import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type PublishResult = {
  ok: boolean;
  steps: Array<{
    step: string;
    ok: boolean;
    code?: number | null;
    stdout?: string;
    stderr?: string;
    error?: string;
  }>;
};

function cleanText(value: unknown, max = 4000) {
  const text = String(value || "");
  return text.length > max ? text.slice(0, max) + "\n...[truncated]" : text;
}

async function runStep(step: string, command: string, cwd = process.cwd()) {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      env: process.env,
      maxBuffer: 1024 * 1024 * 10,
    });

    return {
      step,
      ok: true,
      code: 0,
      stdout: cleanText(stdout),
      stderr: cleanText(stderr),
    };
  } catch (err: any) {
    return {
      step,
      ok: false,
      code: err?.code ?? null,
      stdout: cleanText(err?.stdout),
      stderr: cleanText(err?.stderr),
      error: err?.message || "UNKNOWN_EXEC_ERROR",
    };
  }
}

export async function publishFrontend(): Promise<PublishResult> {
  const steps: PublishResult["steps"] = [];

  const build = await runStep("build", "npm run build");
  steps.push(build);
  if (!build.ok) {
    return { ok: false, steps };
  }

  const restart = await runStep(
    "restart_front",
    "pm2 restart ora-front --update-env"
  );
  steps.push(restart);
  if (!restart.ok) {
    return { ok: false, steps };
  }

  const status = await runStep("status_front", "pm2 status ora-front");
  steps.push(status);

  return {
    ok: steps.every((s) => s.ok),
    steps,
  };
}

export async function publishBackend(): Promise<PublishResult> {
  const steps: PublishResult["steps"] = [];

  const restart = await runStep(
    "restart_backend",
    "pm2 restart ora --update-env"
  );
  steps.push(restart);

  const status = await runStep("status_backend", "pm2 status ora");
  steps.push(status);

  return {
    ok: steps.every((s) => s.ok),
    steps,
  };
}

export async function publishAll(): Promise<PublishResult> {
  const steps: PublishResult["steps"] = [];

  const build = await runStep("build", "npm run build");
  steps.push(build);
  if (!build.ok) {
    return { ok: false, steps };
  }

  const restartFront = await runStep(
    "restart_front",
    "pm2 restart ora-front --update-env"
  );
  steps.push(restartFront);
  if (!restartFront.ok) {
    return { ok: false, steps };
  }

  const restartBack = await runStep(
    "restart_backend",
    "pm2 restart ora --update-env"
  );
  steps.push(restartBack);
  if (!restartBack.ok) {
    return { ok: false, steps };
  }

  const status = await runStep("status_all", "pm2 status");
  steps.push(status);

  return {
    ok: steps.every((s) => s.ok),
    steps,
  };
}
