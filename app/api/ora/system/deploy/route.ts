export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

import {
  authorizeKairosExecution,
} from "../../../../../src/security/kairosExecutionGate";

/**
 * SYSTEM_DEPLOY_CANONICAL_ADAPTER_V1
 *
 * Frontera pública Next:
 *
 *   POST /api/ora/system/deploy
 *
 * Esta ruta conserva compatibilidad con:
 *
 * - Kairos UI;
 * - Builder;
 * - System Action / deploy_full;
 * - callers históricos sobre :3000.
 *
 * Pero NO ejecuta:
 *
 * - npm run build;
 * - pm2 restart;
 * - markProposalAsPublished;
 * - smoke test;
 * - escritura de proposal.
 *
 * Toda ejecución real pertenece al Core ORA:
 *
 *   POST http://127.0.0.1:3001/api/ora/system/deploy
 *
 * El sello recibido se reenvía exactamente.
 * No se lee KAIROS_SEAL desde process.env.
 * No se fabrica autoridad.
 *
 * El Core vuelve a validar su propia frontera
 * requireKairosSeal + KAIROS_EXECUTION_GATE.
 */

const CORE_DEPLOY_URL =
  "http://127.0.0.1:3001/api/ora/system/deploy";

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
    /*
     * Fail-closed también en la frontera Next.
     * El Core repetirá la autorización antes
     * de cualquier efecto real.
     */
    const authorization =
      authorizeKairosExecution(
        req,
        "deploy"
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

    const receivedSeal =
      String(
        req.headers.get(
          "x-kairos-seal"
        ) ||
        req.headers.get(
          "kairos-seal"
        ) ||
        ""
      ).trim();

    /*
     * Preservar el body sin inventar semántica.
     * proposalId/id y cualquier metadata histórica
     * pueden seguir llegando al Core.
     */
    const body =
      await req
        .json()
        .catch(() => ({}));

    const response =
      await fetch(
        CORE_DEPLOY_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
            "x-kairos-seal":
              receivedSeal,
          },
          body:
            JSON.stringify(body),
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
        delegatedBy:
          "/api/ora/system/deploy@next",
        canonicalRuntime:
          "ORA_CORE_EXPRESS",
        canonicalEndpoint:
          "/api/ora/system/deploy",
        canonicalPort:
          3001,
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
          "SYSTEM_DEPLOY_CANONICAL_ADAPTER_FAILED",
        compatibilityAdapter:
          true,
        canonicalRuntime:
          "ORA_CORE_EXPRESS",
        canonicalEndpoint:
          "/api/ora/system/deploy",
      },
      {
        status: 502,
      }
    );
  }
}
