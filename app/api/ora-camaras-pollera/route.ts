export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "ora-camaras-pollera",
    title: "ORA — Ora Camaras Pollera",
    description: "Módulo ora-camaras-pollera generado desde intención por ORA.",
    generatedBy: "ORA module-generator-engine",
  });
}
