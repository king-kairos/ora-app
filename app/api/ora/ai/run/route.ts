export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runAIProposalEngine } from "../../../../../src/ai/autoprog/ai-proposal-engine";

export async function POST() {
  try {
    const result = await runAIProposalEngine();

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "AI_ENGINE_FAILED",
      },
      { status: 500 }
    );
  }
}
