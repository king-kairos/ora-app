export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "camera",
    title: "ORA — Camera",
    description: "Módulo camera generado desde intención por ORA.",
    generatedBy: "ORA module-generator-engine",
  });
}
