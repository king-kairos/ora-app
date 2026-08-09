export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

/*
 * KAIROS_APPROVE_CANONICAL_ADAPTER_V1
 *
 * Esta ruta existe porque KairosBuilderPanel utiliza:
 *
 *   /api/ora/autoprog/patch/approve
 *
 * La aprobación real no se persiste aquí.
 *
 * Se delega al endpoint canónico del backend ORA:
 *
 *   POST /api/ora/autoprog/approve/:id
 *
 * Ese endpoint:
 * - valida el Sello de Kairos;
 * - resuelve la proposal canónica;
 * - registra la aprobación;
 * - mantiene la coherencia del estado.
 *
 * Este adaptador nunca aplica archivos,
 * nunca ejecuta build,
 * nunca reinicia procesos
 * y nunca despliega.
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
    const body = await req
      .json()
      .catch(() => ({}));

    const id = String(
      body?.id || ""
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
     * No se valida ni se compara el sello aquí.
     * La autoridad permanece exclusivamente
     * en el backend canónico.
     *
     * Si falta o es inválido, el backend
     * debe responder fail-closed.
     */
    const response = await fetch(
      `${ORA_INTERNAL_BASE}/api/ora/autoprog/approve/${encodeURIComponent(
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
        cache: "no-store",
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
          "/api/ora/autoprog/approve/:id",
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
          "APPROVE_CANONICAL_ADAPTER_FAILED",
      },
      {
        status: 502,
      }
    );
  }
}
