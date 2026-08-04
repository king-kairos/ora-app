export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import crypto from "crypto";

const KAIROS_SEAL = String(process.env.KAIROS_SEAL || "").trim();

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

function verifySeal(req: NextRequest) {
  const seal = req.headers.get("x-kairos-seal") || "";
  if (!KAIROS_SEAL) return false;

  const a = crypto.createHash("sha256").update(seal).digest("hex");
  const b = crypto.createHash("sha256").update(KAIROS_SEAL).digest("hex");

  return a === b;
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
    if (!verifySeal(req)) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_KAIROS_SEAL",
          message: "Nada se ejecuta sin el Sello de Kairos.",
        },
        { status: 403 }
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
