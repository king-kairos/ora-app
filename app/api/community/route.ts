export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "community",
    title: "ORA — Community",
    description: "Módulo community generado desde intención por ORA.",
    generatedBy: "ORA module-generator-engine",
  });
}
