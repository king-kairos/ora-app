export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { routeEssence } from "@/ai/essences/essence-router";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/ora/essence-router",
    method: "POST",
    message: "Essence Router activo. Envía { input }.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = String(body?.input || "").trim();

    if (!input) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_INPUT",
          message: "Falta input.",
        },
        { status: 400 }
      );
    }

    const route = routeEssence(input);

    return NextResponse.json({
      ok: true,
      input,
      route,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "ESSENCE_ROUTER_FAILED",
      },
      { status: 500 }
    );
  }
}
