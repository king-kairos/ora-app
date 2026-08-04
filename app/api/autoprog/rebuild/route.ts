export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runRebuildAndRestart } from "../../../../src/ai/autoprog/rebuild-engine";

export async function POST() {
  const result = runRebuildAndRestart();
  return NextResponse.json(result);
}

