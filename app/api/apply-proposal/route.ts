export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

/**
 * APPLY_PROPOSAL_CANONICAL_ADAPTER_V1
 *
 * Endpoint de compatibilidad utilizado por consumidores
 * históricos de la cabina.
 *
 * Esta ruta NO ejecuta applyPatch.
 * Esta ruta NO modifica status.
 * Esta ruta NO escribe archivos.
 *
 * Toda aplicación real se delega al backend ORA:
 *
 *   POST /api/ora/autoprog/apply/:id
 *
 * Allí viven:
 *
 * - KAIROS_SEAL;
 * - Execution Gate interno apply_patch;
 * - validación de proposal approved;
 * - validación de kairos_approved;
 * - validación de timestamp;
 * - validación de integridad;
 * - ejecución real del patch;
 * - persistencia del estado applied;
 * - historial de archivos.
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
    const contentType =
      req.headers.get("content-type") || "";

    let proposalId = "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      const body = await req
        .json()
        .catch(() => ({}));

      proposalId = String(
        body?.proposalId ||
        body?.id ||
        ""
      ).trim();
    } else if (
      contentType.includes(
        "application/x-www-form-urlencoded"
      ) ||
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await req.formData();

      proposalId = String(
        formData.get("proposalId") ||
        formData.get("id") ||
        ""
      ).trim();
    }

    if (!proposalId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "PROPOSAL_ID_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    const seal = String(
      req.headers.get(
        "x-kairos-seal"
      ) ||
        req.headers.get(
          "kairos-seal"
        ) ||
        ""
    ).trim();

    /*
     * El adapter no decide si el sello es válido.
     *
     * La autoridad real permanece en ORA Core.
     * Si falta o es incorrecto, el backend canónico
     * debe responder fail-closed.
     */
    const response =
      await fetch(
        `${ORA_INTERNAL_BASE}/api/ora/autoprog/apply/${encodeURIComponent(
          proposalId
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
          "APPLY_CANONICAL_ADAPTER_FAILED",
        compatibilityAdapter:
          true,
        canonicalEndpoint:
          "/api/ora/autoprog/apply/:id",
      },
      {
        status: 500,
      }
    );
  }
}
