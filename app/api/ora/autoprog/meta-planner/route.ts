export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runMetaPlanner } from "@/ai/autoprog/meta-planner";

export async function GET() {
  try {
    const result = await runMetaPlanner();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Fallo interno en meta-planner",
      },
      { status: 500 }
    );
  }
}
