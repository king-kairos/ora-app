export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "lab",
    title: "ORA — LAB",
    description: "Laboratorio evolutivo del núcleo ORA",
    generatedBy: "ORA module-generator-engine",
  });
}
