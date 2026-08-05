export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { authorizeKairosExecution } from "../../../../../src/security/kairosExecutionGate";

function run(cmd: string): Promise<{ ok: boolean; cmd: string; output: string }> {
  return new Promise((resolve) => {
    exec(
      cmd,
      {
        cwd: process.cwd(),
        timeout: 1000 * 60 * 5,
        maxBuffer: 1024 * 1024 * 5,
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          cmd,
          output: `${stdout || ""}\n${stderr || ""}`.trim(),
        });
      }
    );
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/ora/autoprog/deploy",
    method: "POST",
    purpose: "Build + restart supervisado por Sello Kairos",
  });
}

export async function POST(req: NextRequest) {
  try {
    const authorization = authorizeKairosExecution(
      req,
      "deploy"
    );

    if (!authorization.ok) {
      return NextResponse.json(
        {
          ok: false,
          action: authorization.action,
          error: authorization.error,
          message:
            "Nada se ejecuta sin autorización válida del Sello de Kairos.",
        },
        {
          status: authorization.status,
        }
      );
    }

    const steps = [];

    steps.push(await run("npm run build"));

    if (!steps[0].ok) {
      return NextResponse.json({
        ok: false,
        stage: "build",
        message: "El build falló. No se reinició nada.",
        steps,
      });
    }

    steps.push(await run("pm2 restart ora-front"));
    steps.push(await run("pm2 restart ora"));

    const success = steps.every((s) => s.ok);

    return NextResponse.json({
      ok: success,
      message: success
        ? "Deploy completo: build + restart ejecutados correctamente."
        : "Deploy parcial: revisa los pasos.",
      steps,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "DEPLOY_FAILED",
      },
      { status: 500 }
    );
  }
}
