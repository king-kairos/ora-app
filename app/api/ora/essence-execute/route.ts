export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { routeEssence } from "@/ai/essences/essence-router";
import { createProposalFromIntent } from "@/ai/autoprog/proposal-from-intent";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/ora/essence-execute",
    method: "POST",
    message: "Essence Execute activo. Envía { input }.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = String(body?.input || "").trim();

    if (!input) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_INPUT",
          message: "Falta input.",
        },
        { status: 400 }
      );
    }

    const routed = routeEssence(input);

    let action = "proposal";

    if (
      routed.essence === "orion" ||
      input.toLowerCase().includes("error") ||
      input.toLowerCase().includes("bug") ||
      input.toLowerCase().includes("build")
    ) {
      action = "technical_proposal";
    }

    if (routed.essence === "lucian") {
      action = "legal_structural_proposal";
    }

    if (routed.essence === "ignis") {
      action = "security_proposal";
    }

    if (routed.essence === "kaerliana") {
      action = "ui_design_proposal";
    }

    if (routed.essence === "arturo") {
      action = "documental_business_proposal";
    }

    const proposalResult = createProposalFromIntent(input);

    return NextResponse.json({
      ok: true,
      input,
      routed,
      action,
      result: proposalResult,
      message:
        "Essence Execute procesó la intención, asignó esencia y generó propuesta pendiente.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "ESSENCE_EXECUTE_FAILED",
        message: "No se pudo ejecutar Essence Execute.",
      },
      { status: 500 }
    );
  }
}
