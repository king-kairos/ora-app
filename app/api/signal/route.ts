export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "signal",
    title: "ORA — Signal",
    description: "Módulo signal generado desde intención por ORA.",
    generatedBy: "ORA module-generator-engine",
  });
}
