export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/**
 * KAIROS_DEPLOY_LEGACY_RETIRED
 *
 * Esta ruta ejecutaba un motor de deploy interno
 * sin atravesar la frontera soberana central.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      retired: true,
      mode:
        "KAIROS_DEPLOY_LEGACY_RETIRED",
      error: "LEGACY_ROUTE_RETIRED",
      message:
        "Esta entrada legacy fue retirada. Use safe-publish o system deploy bajo la Puerta Kairos.",
      replacements: {
        safePublish:
          "/api/kairos/autoprog/safe-publish",
        deploy:
          "/api/ora/system/deploy",
        autoprogDeploy:
          "/api/ora/autoprog/deploy",
      },
      kairosGateRequiredOnReplacement:
        true,
    },
    {
      status: 410,
    }
  );
}
