export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  runIntentEngine,
} from "../../../../src/ai/autoprog/intent-engine";

/**
 * Entrada de intención estructural.
 *
 * Esta ruta solamente:
 * - interpreta;
 * - genera contenido en memoria;
 * - crea una proposal pendiente.
 *
 * No registra módulos activos.
 * No escribe targets productivos.
 * No ejecuta build/restart/deploy.
 */
export async function POST(
  req: Request
) {
  try {
    const body =
      await req
        .json()
        .catch(() => ({}));

    const intent =
      String(
        body?.intent || ""
      ).trim();

    if (!intent) {
      return Response.json(
        {
          ok: false,
          error:
            "EMPTY_INTENT",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await runIntentEngine({
        intent,
      });

    return Response.json(
      result,
      {
        status:
          result?.ok
            ? 200
            : 400,
      }
    );
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error:
          error?.message ||
          "INTENT_EXEC_FAIL",
      },
      {
        status: 500,
      }
    );
  }
}
