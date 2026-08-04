export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runKairosPublicClone } from "../../../src/ai/public/kairos-public-clone";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = String(body?.prompt || "");

    const result = await runKairosPublicClone(prompt);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        text: "Hubo un fallo conectando con Kairos."
      },
      { status: 500 }
    );
  }
}
