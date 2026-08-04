export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { generateReadyTaskProposals } from "@/kairos/strategic-planner/proposal-engine";

function clean(value: unknown) {
  return String(value || "").trim();
}

function validateSeal(req: Request) {
  const received = clean(
    req.headers.get("x-kairos-seal") ||
      req.headers.get("kairos-seal")
  );

  const expected = clean(process.env.KAIROS_SEAL);

  return Boolean(
    received &&
      expected &&
      received === expected
  );
}

export async function POST(req: Request) {
  try {
    if (!validateSeal(req)) {
      return NextResponse.json(
        {
          ok: false,
          error: "SELLO_INVALIDO",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const planId = clean(body?.planId);

    if (!planId) {
      return NextResponse.json(
        {
          ok: false,
          error: "PLAN_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    const result =
      await generateReadyTaskProposals(planId);

    return NextResponse.json({
      ...result,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "STRATEGIC_PROPOSAL_GENERATION_FAILED",
      },
      { status: 500 }
    );
  }
}
