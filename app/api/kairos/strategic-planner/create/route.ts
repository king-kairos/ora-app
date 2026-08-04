export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { createStrategicPlan } from "@/kairos/strategic-planner/engine";

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

    const intent = clean(
      body?.intent ||
      body?.input ||
      body?.instruction
    );

    const branch = clean(body?.branch) || undefined;

    const preferredEssence =
      clean(body?.preferredEssence || body?.essence) ||
      undefined;

    const targetFiles = Array.isArray(body?.targetFiles)
      ? body.targetFiles.map(clean).filter(Boolean)
      : undefined;

    if (!intent) {
      return NextResponse.json(
        {
          ok: false,
          error: "EMPTY_INTENT",
        },
        { status: 400 }
      );
    }

    const plan = await createStrategicPlan({
      intent,
      branch,
      targetFiles,
      preferredEssence,
    });

    return NextResponse.json({
      ok: true,
      mode: "KAIROS_STRATEGIC_PLANNER_V1",
      plan,
      message:
        "Plan estratégico creado y guardado. No se generaron propuestas, no se aplicaron archivos y no se ejecutó deploy.",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "STRATEGIC_PLAN_CREATE_FAILED",
      },
      { status: 500 }
    );
  }
}
