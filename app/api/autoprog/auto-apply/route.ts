export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runAutoApplySafe } from "../../../../src/ai/autoprog/auto-apply-engine";

export async function GET() {
  try {
    const result = await runAutoApplySafe();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Fallo interno en auto-apply seguro",
      },
      { status: 500 }
    );
  }
}
