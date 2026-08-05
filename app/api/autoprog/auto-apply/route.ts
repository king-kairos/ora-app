export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

function retiredResponse() {
  return NextResponse.json(
    {
      ok: false,
      retired: true,
      mode:
        "AUTO_APPLY_LEGACY_RETIRED",
      error:
        "AUTONOMOUS_MUTATION_DISABLED",
      message:
        "Auto-apply fue retirado porque una mutación real requiere autorización explícita mediante la Puerta Kairos.",
      replacement:
        "/api/kairos/autoprog/apply",
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
