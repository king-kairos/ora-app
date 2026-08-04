export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generateProposalPlan } from "../../../../../src/ai/orchestrator/proposalGenerationEngine";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const intent = clean(body?.intent || body?.input || body?.instruction);
    const branch = clean(body?.branch) || undefined;
    const targetFiles = Array.isArray(body?.targetFiles)
      ? body.targetFiles.map(clean).filter(Boolean)
      : undefined;

    if (!intent) {
      return NextResponse.json(
        { ok: false, error: "EMPTY_INTENT" },
        { status: 400 }
      );
    }

    const plan = generateProposalPlan({
      intent,
      branch,
      targetFiles,
    });

    return NextResponse.json({
      ok: true,
      mode: "AUTO_PROGRAMMING_PLAN",
      plan,
      message:
        "Plan de auto-programación generado. Nada fue aplicado. Requiere aprobación del Sello de Kairos.",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "GENERATE_PLAN_FAIL",
      },
      { status: 500 }
    );
  }
}
