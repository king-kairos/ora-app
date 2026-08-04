export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "gateway",
    title: "ORA — Gateway",
    description: "Módulo gateway generado desde intención por ORA.",
    generatedBy: "ORA module-generator-engine",
  });
}
