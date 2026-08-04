export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createProposalFromIntent } from "@/ai/autoprog/proposal-from-intent";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/ora/intent",
    method: "POST",
    message: "Ruta activa. Envía { input } por POST para crear propuesta.",
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
          message: "Falta la intención para crear la propuesta.",
        },
        { status: 400 }
      );
    }

    const result = await createProposalFromIntent(input);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "INTENT_FAILED",
        message: "No se pudo crear la propuesta.",
      },
      { status: 500 }
    );
  }
}
