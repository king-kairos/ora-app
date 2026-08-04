export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "kairos-control",
    title: "ORA — Kairos Control",
    description: "Módulo kairos-control generado desde intención por ORA.",
    generatedBy: "ORA module-generator-engine",
  });
}
