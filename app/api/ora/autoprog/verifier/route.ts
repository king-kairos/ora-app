export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { exec } from "child_process";

function run(cmd: string): Promise<{ ok: boolean; output: string }> {
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
          output: `${stdout || ""}\n${stderr || ""}`.trim(),
        });
      }
    );
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/ora/autoprog/verifier",
    message: "Verifier activo. Usa POST para correr verificación.",
  });
}

export async function POST() {
  const build = await run("npm run build");

  return NextResponse.json({
    ok: build.ok,
    status: build.ok ? "PASSED" : "FAILED",
    message: build.ok
      ? "Verificación correcta. El sistema compila."
      : "Verificación falló. Hay errores que deben corregirse antes de aplicar más.",
    output: build.output,
  });
}
