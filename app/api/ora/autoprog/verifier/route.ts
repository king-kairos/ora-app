export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { exec } from "child_process";

import {
  authorizeKairosExecution,
} from "../../../../../src/security/kairosExecutionGate";

function run(
  cmd: string
): Promise<{
  ok: boolean;
  output: string;
}> {
  return new Promise((resolve) => {
    exec(
      cmd,
      {
        cwd: process.cwd(),
        timeout: 1000 * 60 * 5,
        maxBuffer: 1024 * 1024 * 10,
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          output:
            `${stdout || ""}\n${stderr || ""}`.trim(),
        });
      }
    );
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/ora/autoprog/verifier",
    method: "POST",
    authority: "KAIROS_EXECUTION_GATE",
    action: "modify_runtime",
    message:
      "Verifier activo. El build requiere Sello de Kairos.",
  });
}

export async function POST(req: Request) {
  const authorization =
    authorizeKairosExecution(
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

  const build = await run("npm run build");

  return NextResponse.json({
    ok: build.ok,
    status: build.ok
      ? "PASSED"
      : "FAILED",
    message: build.ok
      ? "Verificación correcta. El sistema compila."
      : "Verificación falló. No se deben aplicar ni publicar más cambios.",
    output: build.output.slice(-10000),
  });
}
