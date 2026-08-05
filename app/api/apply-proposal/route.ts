export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

import {
  applyPatch,
} from "../../../src/ai/autoprog/applyPatch";

import {
  authorizeKairosExecution,
} from "../../../src/security/kairosExecutionGate";

/**
 * Adaptador de compatibilidad.
 *
 * Conserva el endpoint utilizado por la cabina,
 * pero toda aplicación real pasa ahora por:
 *
 * 1. Puerta Kairos central.
 * 2. Motor applyPatch soberano.
 * 3. Validación de proposal aprobada.
 * 4. Restricciones internas de rutas.
 */
export async function POST(req: Request) {
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
          action: authorization.action,
          error: authorization.error,
        },
        {
          status: authorization.status,
        }
      );
    }

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
          error: "PROPOSAL_ID_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await applyPatch(proposalId);

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      return NextResponse.json(
        {
          ...result,
          compatibilityAdapter: true,
          engine:
            "SOVEREIGN_APPLY_PATCH",
        },
        {
          status:
            result?.ok === true
              ? 200
              : 409,
        }
      );
    }

    if (result?.ok !== true) {
      return NextResponse.json(
        {
          ...result,
          compatibilityAdapter: true,
          engine:
            "SOVEREIGN_APPLY_PATCH",
        },
        {
          status: 409,
        }
      );
    }

    return new NextResponse(null, {
      status: 303,
      headers: {
        Location: "/kairos",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "APPLY_PROPOSAL_ADAPTER_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}
