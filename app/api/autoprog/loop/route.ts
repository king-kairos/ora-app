export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  runSafeLoop,
  stopSafeLoop,
  getSafeLoopStatus,
} from "../../../../src/ai/autoprog/safe-loop";

export async function GET() {
  try {
    const result = await runSafeLoop();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Fallo iniciando safe loop",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim().toLowerCase();

    if (action === "stop") {
      const result = stopSafeLoop();
      return NextResponse.json(result);
    }

    if (action === "status") {
      const status = getSafeLoopStatus();
      return NextResponse.json(status);
    }

    const status = getSafeLoopStatus();

    return NextResponse.json({
      message: "Sin acción específica, devolviendo estado del loop",
      ...status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Fallo en loop route",
      },
      { status: 500 }
    );
  }
}
