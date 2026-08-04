export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "social",
    title: "ORA — Social",
    description: "Módulo social generado desde intención por ORA.",
    generatedBy: "ORA module-generator-engine",
  });
}
