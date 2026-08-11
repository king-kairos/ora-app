export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/**
 * ORA_AUTOPROG_AUTOFIX_LEGACY_RETIRED_V1
 *
 * La ruta histórica podía crear proposals persistentes
 * sin autorización Kairos.
 *
 * La reparación activa pertenece al flujo soberano:
 *
 * /api/kairos/autoprog/auto-repair
 *
 * AutoRepair puede proponer una reparación bajo Sello Kairos,
 * pero nunca aplicarla automáticamente.
 */
function retiredResponse() {
  return NextResponse.json(
    {
      ok: false,
      retired: true,
      mode: "ORA_AUTOPROG_AUTOFIX_LEGACY_RETIRED_V1",
      error: "UNAUTHORIZED_AUTOFIX_ROUTE_RETIRED",
      replacement: "/api/kairos/autoprog/auto-repair",
      replacementRequiresKairosSeal: true,
      autonomousApply: false,
    },
    { status: 410 }
  );
}

export async function GET() {
  return retiredResponse();
}

export async function POST() {
  return retiredResponse();
}
