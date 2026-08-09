export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

/**
 * KAIROS_DENY_LEGACY_RETIRED
 *
 * Esta ruta antigua modificaba directamente archivos
 * de propuestas bajo data/coherencia/proposals.
 *
 * La transición deny canónica pertenece al backend ORA:
 *
 *   POST /api/ora/autoprog/deny/:id
 *
 * y requiere autoridad Kairos.
 *
 * Esta ruta queda conservada únicamente como respuesta
 * explícita de compatibilidad. No modifica estado.
 */
function retiredResponse() {
  return NextResponse.json(
    {
      ok: false,
      retired: true,
      mode:
        "KAIROS_DENY_LEGACY_RETIRED",
      error:
        "LEGACY_STATUS_ROUTE_RETIRED",
      replacement:
        "/api/ora/autoprog/deny/:id",
      directMutation: false,
      message:
        "La ruta legacy de deny fue retirada. Use el endpoint canónico protegido.",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET() {
  return retiredResponse();
}

export async function POST() {
  return retiredResponse();
}
