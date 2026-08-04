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

    if (!intent) {
      return NextResponse.json({ ok: false, error: "EMPTY_INTENT" }, { status: 400 });
    }

    const plan = generateProposalPlan({ intent });

    return NextResponse.json({
      ok: true,
      mode: "AUTO_PROGRAMMING_PLAN_PREVIEW",
      plan,
      preview: {
        before: null,
        after: `// AUTO GENERATED PREVIEW

// Intent:
${intent}

// Selected Essence:
${plan.proposedBy}

// Proposed Target:
${plan.targetFiles?.[0] || "unknown"}

// Proposal:
${plan.summary}
`,
      },
      requiresApproval: true,
      canExecute: false,
      message: "Preview generado. No se aplicó ningún cambio. Requiere aprobación del Sello de Kairos.",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "PLAN_PREVIEW_FAIL" },
      { status: 500 }
    );
  }
}
