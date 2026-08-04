export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "pollera",
    title: "ORA — Pollera",
    description: "Módulo pollera generado desde intención por ORA.",
    generatedBy: "ORA module-generator-engine",
  });
}
