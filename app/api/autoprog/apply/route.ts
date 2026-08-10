export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

import {
  authorizeKairosExecution,
} from "../../../../src/security/kairosExecutionGate";

/**
 * AUTOPROG_APPLY_CANONICAL_ADAPTER_V1
 *
 * Ruta histórica activa:
 *
 *   POST /api/autoprog/apply
 *
 * Esta frontera:
 *
 * - conserva compatibilidad;
 * - valida fail-closed con la Puerta Kairos;
 * - NO ejecuta applyPatch;
 * - NO persiste status;
 * - NO escribe archivos.
 *
 * Toda mutación real se delega a:
 *
 *   POST /api/ora/autoprog/apply/:id
 *
 * El backend ORA canónico vuelve a validar internamente
 * antes de ejecutar cualquier modificación real.
 */

const ORA_INTERNAL_BASE =
  String(
    process.env.ORA_INTERNAL_BASE_URL ||
      process.env.ORA_API_BASE_URL ||
      "http://127.0.0.1:3001"
  )
    .trim()
    .replace(/\/+$/, "");

async function safeJson(
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

export async function POST(
  req: Request
) {
  try {
    const authorization =
      authorizeKairosExecution(
        req,
        "apply_patch"
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

    const body =
      await req
        .json()
        .catch(() => ({}));

    const id =
      String(
        body?.id ||
        body?.proposalId ||
        ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "MISSING_PROPOSAL_ID",
        },
        {
          status: 400,
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

    const response =
      await fetch(
        `${ORA_INTERNAL_BASE}/api/ora/autoprog/apply/${encodeURIComponent(
          id
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
            "x-kairos-seal":
              seal,
          },
          body:
            JSON.stringify({}),
          cache:
            "no-store",
        }
      );

    const data =
      await safeJson(response);

    return NextResponse.json(
      {
        ...data,
        compatibilityAdapter:
          true,
        canonicalEndpoint:
          "/api/ora/autoprog/apply/:id",
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
        error:
          error?.message ||
          "AUTOPROG_APPLY_CANONICAL_ADAPTER_FAILED",
      },
      {
        status: 502,
      }
    );
  }
}
