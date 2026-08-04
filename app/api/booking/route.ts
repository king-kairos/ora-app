export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "booking",
    title: "ORA — Booking",
    description: "Módulo booking generado desde intención por ORA.",
    generatedBy: "ORA module-generator-engine",
  });
}
