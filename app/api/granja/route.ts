export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "granja",
    title: "ORA — Granja",
    description: "Módulo granja generado desde intención por ORA.",
    generatedBy: "ORA module-generator-engine",
  });
}
