export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { detectImprovements } from "../../../../src/ai/autoprog/detect-engine";

export async function GET() {
  try {
    const result = await detectImprovements();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Fallo interno",
      },
      { status: 500 }
    );
  }
}
