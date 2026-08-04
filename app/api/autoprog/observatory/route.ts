export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runObservatoryScan } from "../../../../src/ai/autoprog/observatory-engine";

export async function GET() {
  try {
    const report = await runObservatoryScan();
    return NextResponse.json({ ok: true, report });
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
