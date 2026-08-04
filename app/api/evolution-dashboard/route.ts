export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "evolution-dashboard",
    title: "ORA — Evolution Dashboard",
    description: "Módulo evolution-dashboard generado desde intención por ORA.",
    generatedBy: "ORA module-generator-engine",
  });
}
