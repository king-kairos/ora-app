export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

/**
 * LEGACY_BACKUP_ROUTE_RETIRED
 *
 * Esta copia duplicada ejecutaba mkdir y cp directamente,
 * tenía validación local de sello y podía incluir archivos
 * sensibles como .env.
 *
 * La única ruta activa de backup es:
 *
 * app/api/ora/system/backup/route.ts
 *
 * Toda ejecución real exige ahora la acción "backup"
 * mediante la Puerta Kairos central.
 */
function retiredResponse() {
  return NextResponse.json(
    {
      ok: false,
      retired: true,
      mode:
        "LEGACY_BACKUP_ROUTE_RETIRED",
      error:
        "LEGACY_ROUTE_RETIRED",
      replacement:
        "/api/ora/system/backup",
      requiredAction:
        "backup",
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
