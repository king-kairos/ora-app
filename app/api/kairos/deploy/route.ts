export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runSovereignDeploy } from "../../../../src/ai/system/deploy-engine";

export async function POST() {
  try {
    const result = await runSovereignDeploy();
    return NextResponse.json(result, {
      status: result.ok ? 200 : 500,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Fallo en deploy soberano",
      },
      { status: 500 }
    );
  }
}
