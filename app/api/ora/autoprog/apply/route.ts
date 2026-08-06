export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

/**
 * ORA_AUTOPROG_APPLY_LEGACY_RETIRED
 *
 * Esta ruta duplicaba la aplicación de propuestas y podía:
 *
 * - escribir archivos directamente;
 * - eliminar archivos directamente;
 * - modificar el estado de propuestas;
 * - generar contenido implícito;
 * - operar sin la Puerta Kairos central;
 * - operar sin exigir estado approved.
 *
 * Toda aplicación real debe pasar por el motor soberano:
 *
 * /api/kairos/autoprog/apply
 *
 * Ese reemplazo exige:
 *
 * - Puerta Kairos central;
 * - acción apply_patch;
 * - propuesta aprobada;
 * - restricciones internas de rutas;
 * - motor central src/ai/autoprog/applyPatch.ts.
 */
function retiredResponse() {
  return NextResponse.json(
    {
      ok: false,
      retired: true,
      mode:
        "ORA_AUTOPROG_APPLY_LEGACY_RETIRED",
      error:
        "LEGACY_ROUTE_RETIRED",
      message:
        "La entrada duplicada de apply fue retirada. Use el flujo soberano protegido.",
      replacement:
        "/api/kairos/autoprog/apply",
      replacementEngine:
        "src/ai/autoprog/applyPatch.ts",
      requiredAction:
        "apply_patch",
      proposalMustBeApproved:
        true,
      kairosGateRequiredOnReplacement:
        true,
    },
    {
      status: 410,
    }
  );
}

export async function GET() {
  return retiredResponse();
}

export async function POST() {
  return retiredResponse();
}
