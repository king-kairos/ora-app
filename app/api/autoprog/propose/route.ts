export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  createAutoProposal,
  createProposal,
  listProposals,
} from "../../../../src/ai/autoprog/proposal-engine";

export async function GET() {
  try {
    const items = await listProposals();
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Fallo interno" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode || "auto");

    if (mode === "auto") {
      const proposedBy =
        body?.proposedBy === "rafael" ||
        body?.proposedBy === "kaerliana" ||
        body?.proposedBy === "orion" ||
        body?.proposedBy === "arturo"
          ? body.proposedBy
          : "rafael";

      const proposal = await createAutoProposal(proposedBy);
      return NextResponse.json({ ok: true, proposal });
    }

    const proposal = await createProposal({
      title: String(body?.title || "Nueva propuesta"),
      summary: String(body?.summary || "Sin resumen"),
      type: body?.type || "improvement",
      risk: body?.risk || "medium",
      reason: String(body?.reason || "Sin razón"),
      proposedBy: body?.proposedBy || "rafael",
      source: body?.source || "manual",
      tags: Array.isArray(body?.tags) ? body.tags : [],
      files: Array.isArray(body?.files) ? body.files : [],
    });

    return NextResponse.json({ ok: true, proposal });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Fallo interno" },
      { status: 500 }
    );
  }
}
