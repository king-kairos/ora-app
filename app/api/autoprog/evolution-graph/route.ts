export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  buildEvolutionGraph,
  getNextEvolutionCandidates,
} from "../../../../src/ai/autoprog/evolution-graph";

export async function GET() {
  try {
    const graph = buildEvolutionGraph();
    const next = getNextEvolutionCandidates();

    return NextResponse.json({
      ok: true,
      graph,
      next,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Fallo en evolution graph",
      },
      { status: 500 }
    );
  }
}
