export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      retired: true,
      mode:
        "KAIROS_PROXY_MULTI_FILE_RETIRED",
      error:
        "LEGACY_ROUTE_RETIRED",
      replacement:
        "/api/ora/intent-patch/multi-file-apply",
      message:
        "El proxy duplicado fue retirado. Use la ruta soberana activa.",
    },
    {
      status: 410,
    }
  );
}
