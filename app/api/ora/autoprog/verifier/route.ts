export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

import {
  authorizeKairosExecution,
} from "../../../../../src/security/kairosExecutionGate";

/**
 * KAIROS_VERIFIER_CANONICAL_ADAPTER_V1
 *
 * Ruta legacy:
 *
 *   POST /api/ora/autoprog/verifier
 *
 * Ya NO ejecuta npm run build directamente.
 *
 * El único ejecutor de build aislado es:
 *
 *   POST /api/kairos/autoprog/build-validate
 *
 * El sello recibido se reenvía sin fabricar autoridad.
 * Build Validate vuelve a validar modify_runtime.
 *
 * Se preserva el contrato histórico:
 *
 *   status: PASSED | FAILED
 *   output: string
 */

const CANONICAL_BUILD_URL =
  "http://127.0.0.1:3000/api/kairos/autoprog/build-validate";

async function readJson(
  response: Response
) {
  const text =
    await response.text();

  try {
    return text
      ? JSON.parse(text)
      : {};
  } catch {
    return {
      raw: text,
    };
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route:
      "/api/ora/autoprog/verifier",
    method:
      "POST",
    authority:
      "KAIROS_EXECUTION_GATE",
    action:
      "modify_runtime",
    compatibilityAdapter:
      true,
    canonicalBuild:
      true,
    canonicalEndpoint:
      "/api/kairos/autoprog/build-validate",
    message:
      "Verifier legacy activo como adapter del Build Validation Engine canónico.",
  });
}

export async function POST(
  req: Request
) {
  try {
    const authorization =
      authorizeKairosExecution(
        req,
        "modify_runtime"
      );

    if (!authorization.ok) {
      return NextResponse.json(
        {
          ok: false,
          action:
            authorization.action,
          error:
            authorization.error,
        },
        {
          status:
            authorization.status,
        }
      );
    }

    const seal =
      String(
        req.headers.get(
          "x-kairos-seal"
        ) ||
        req.headers.get(
          "kairos-seal"
        ) ||
        ""
      ).trim();

    const body =
      await req
        .json()
        .catch(() => ({}));

    const response =
      await fetch(
        CANONICAL_BUILD_URL,
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
            "x-kairos-seal":
              seal,
          },
          body:
            JSON.stringify({
              ...body,
              source:
                body?.source ||
                "legacy-verifier-adapter",
            }),
          cache:
            "no-store",
        }
      );

    const build =
      await readJson(
        response
      );

    const passed =
      response.ok &&
      build?.ok !== false &&
      build?.buildPassed !== false;

    const stdout =
      String(
        build?.stdout || ""
      );

    const stderr =
      String(
        build?.stderr || ""
      );

    const output =
      `${stdout}${
        stdout && stderr
          ? "\n"
          : ""
      }${stderr}`.trim();

    return NextResponse.json(
      {
        ok:
          passed,
        status:
          passed
            ? "PASSED"
            : "FAILED",
        message:
          passed
            ? "Verificación correcta. El sistema compila."
            : "Verificación falló. No se deben aplicar ni publicar más cambios.",
        output:
          output.slice(-10000),
        compatibilityAdapter:
          true,
        canonicalBuild:
          true,
        canonicalEndpoint:
          "/api/kairos/autoprog/build-validate",
        build,
      },
      {
        status:
          response.status,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        status:
          "FAILED",
        error:
          error?.message ||
          "VERIFIER_CANONICAL_ADAPTER_FAILED",
        compatibilityAdapter:
          true,
        canonicalBuild:
          true,
        canonicalEndpoint:
          "/api/kairos/autoprog/build-validate",
      },
      {
        status: 502,
      }
    );
  }
}
