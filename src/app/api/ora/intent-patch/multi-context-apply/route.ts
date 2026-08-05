export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      retired: true,
      mode:
        "MULTI_CONTEXT_ROUTE_DUPLICATE_RETIRED",
      error:
        "LEGACY_ROUTE_RETIRED",
      replacement:
        "/api/ora/intent-patch/multi-context-apply",
      message:
        "Esta copia residual fue retirada. Use la ruta activa protegida por la Puerta Kairos.",
    },
    {
      status: 410,
    }
  );
}
