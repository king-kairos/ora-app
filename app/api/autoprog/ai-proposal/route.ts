export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runAIProposalEngine } from "../../../../src/ai/autoprog/ai-proposal-engine";

export async function GET() {
  try {
    const result = await runAIProposalEngine();
    return NextResponse.json(result);
  } catch (error) {
    console.error("AI proposal engine failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "AI proposal engine failed",
      },
      { status: 500 }
    );
  }
}
