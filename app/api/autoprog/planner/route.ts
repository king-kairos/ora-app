export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runAutoprogPlanner } from "../../../../src/ai/autoprog/autoprog-planner";

export async function GET() {
  try {
    const result = await runAutoprogPlanner();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Fallo en autoprog planner",
      },
      { status: 500 }
    );
  }
}
