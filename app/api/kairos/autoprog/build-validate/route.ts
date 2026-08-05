export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { authorizeKairosExecution } from "../../../../../src/security/kairosExecutionGate";

function run(cmd: string) {
  return new Promise<{ ok: boolean; stdout: string; stderr: string }>((resolve) => {
    exec(cmd, { cwd: process.cwd(), timeout: 1000 * 60 * 8, maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: String(stdout || ""),
        stderr: String(stderr || ""),
      });
    });
  });
}

export async function POST(req: Request) {
  try {
    const authorization = authorizeKairosExecution(
      req,
      "modify_runtime"
    );

    if (!authorization.ok) {
      return NextResponse.json(
        {
          ok: false,
          action: authorization.action,
          error: authorization.error,
        },
        {
          status: authorization.status,
        }
      );
    }

    const result = await run("npm run build");

    return NextResponse.json({
      ok: result.ok,
      mode: "BUILD_VALIDATION_ENGINE",
      canPublish: result.ok,
      buildPassed: result.ok,
      stdout: result.stdout.slice(-8000),
      stderr: result.stderr.slice(-8000),
      message: result.ok
        ? "Build validado correctamente. Puede continuar a publish."
        : "Build falló. No publicar. Se requiere AutoFix o corrección manual.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "BUILD_VALIDATE_FAIL" },
      { status: 500 }
    );
  }
}
