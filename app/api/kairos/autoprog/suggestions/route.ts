export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  addEvolutionSuggestion,
  listEvolutionQueue,
} from "../../../../../src/ai/autoprog/evolutionQueue";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: "AUTO_EVOLUTION_QUEUE",
    suggestions: listEvolutionQueue(),
    createdAt: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const title = clean(body?.title);
    const message = clean(body?.message);
    const suggestedIntent = clean(body?.suggestedIntent || body?.intent);
    const essence = clean(body?.essence) || "rafael";
    const priority = clean(body?.priority) || "medium";

    if (!title || !message || !suggestedIntent) {
      return NextResponse.json(
        { ok: false, error: "MISSING_SUGGESTION_FIELDS" },
        { status: 400 }
      );
    }

    const item = addEvolutionSuggestion({
      title,
      message,
      suggestedIntent,
      essence,
      priority: priority === "high" || priority === "low" ? priority : "medium",
    });

    return NextResponse.json({
      ok: true,
      mode: "AUTO_EVOLUTION_SUGGESTION_CREATED",
      suggestion: item,
      message: "Sugerencia guardada. Ningún cambio fue aplicado.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "AUTO_EVOLUTION_QUEUE_FAIL" },
      { status: 500 }
    );
  }
}
