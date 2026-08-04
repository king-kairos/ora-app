export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createOperation } from "@/kairos/orchestrator/engine";

function validSeal(req: Request) {
  const expected = String(process.env.KAIROS_SEAL || "").trim();
  if (!expected) return true;

  const received = String(
    req.headers.get("x-kairos-seal") || ""
  ).trim();

  return received === expected;
}

export async function POST(req: Request) {
  if (!validSeal(req)) {
    return NextResponse.json(
      { ok: false, error: "SELLO_INVALIDO" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const proposalId = String(body?.proposalId || body?.id || "").trim();

    if (!proposalId) {
      return NextResponse.json(
        { ok: false, error: "PROPOSAL_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const operation = await createOperation(proposalId);

    return NextResponse.json({
      ok: true,
      mode: "KAIROS_ORCHESTRATOR",
      phase: 1,
      operation,
      message:
        "Operación registrada. Ningún cambio fue aplicado automáticamente.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "ORCHESTRATOR_START_FAILED",
      },
      { status: 500 }
    );
  }
}
