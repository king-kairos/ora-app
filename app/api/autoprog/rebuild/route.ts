export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/**
 * AUTOPROG_REBUILD_LEGACY_RETIRED
 *
 * Esta ruta ejecutaba build y restart directamente
 * fuera de la Puerta Kairos.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      retired: true,
      mode:
        "AUTOPROG_REBUILD_LEGACY_RETIRED",
      error: "LEGACY_ROUTE_RETIRED",
      message:
        "Esta entrada legacy fue retirada. Use build-validate, finalize o system deploy bajo la Puerta Kairos.",
      replacements: {
        build:
          "/api/kairos/autoprog/build-validate",
        finalize:
          "/api/kairos/orchestrator/finalize",
        deploy:
          "/api/ora/system/deploy",
      },
      kairosGateRequiredOnReplacement:
        true,
    },
    {
      status: 410,
    }
  );
}
