export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { analyzeBranchEvolution } from "../../../../../src/ai/observer/branchEvolutionEngine";

export async function GET() {
  return NextResponse.json(analyzeBranchEvolution());
}
