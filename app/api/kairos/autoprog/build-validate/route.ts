export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
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

    const body = await req.json().catch(() => ({}));
    const proposalId = String(body?.proposalId || "").trim() || null;
    const branch = String(body?.branch || "").trim() || null;

    const buildDirName = ".next-build-validate";
    const buildDir = path.join(process.cwd(), buildDirName);
    const lockDir = path.join(
      process.cwd(),
      ".next-build-validate.lock"
    );

    try {
      fs.mkdirSync(lockDir);
    } catch (error: any) {
      if (error?.code === "EEXIST") {
        return NextResponse.json(
          {
            ok: false,
            mode: "BUILD_VALIDATION_ENGINE",
            canPublish: false,
            buildPassed: false,
            error: "BUILD_VALIDATION_ALREADY_RUNNING",
          },
          { status: 409 }
        );
      }

      throw error;
    }

    let result;

    try {
      fs.rmSync(buildDir, { recursive: true, force: true });

      result = await run(
        `NEXT_DIST_DIR=${buildDirName} npm run build`
      );
    } finally {
      fs.rmSync(lockDir, { recursive: true, force: true });
    }

    const buildIdPresent =
      result.ok &&
      fs.existsSync(path.join(buildDir, "BUILD_ID"));

    const buildPassed = result.ok && buildIdPresent;

    return NextResponse.json({
      ok: buildPassed,
      mode: "BUILD_VALIDATION_ENGINE",
      canPublish: buildPassed,
      buildPassed,
      isolatedBuild: true,
      buildIdPresent,
      proposalId,
      branch,
      stdout: result.stdout.slice(-8000),
      stderr: result.stderr.slice(-8000),
      message: buildPassed
        ? "Build aislado validado correctamente. Puede continuar a publish."
        : "Build aislado falló o no generó BUILD_ID. No publicar.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "BUILD_VALIDATE_FAIL" },
      { status: 500 }
    );
  }
}
