export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { readStrategicPlan } from "@/kairos/strategic-planner/engine";

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

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const planId = clean(url.searchParams.get("planId"));

    if (!planId) {
      return NextResponse.json(
        {
          ok: false,
          error: "PLAN_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    const plan = await readStrategicPlan(planId);

    if (!plan) {
      return NextResponse.json(
        {
          ok: false,
          error: "STRATEGIC_PLAN_NOT_FOUND",
          planId,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode: "KAIROS_STRATEGIC_PLANNER_STATUS_V1",
      plan,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "STRATEGIC_PLAN_STATUS_FAILED",
      },
      { status: 500 }
    );
  }
}
