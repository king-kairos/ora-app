export const runtime = "nodejs";

import { NextResponse } from "next/server";

const { createBranch } = require("../../../../ai/autoprog/branch-engine");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const celestialId = String(body?.celestialId || "").trim();

    if (!name || !celestialId) {
      return NextResponse.json(
        { ok: false, error: "Faltan name o celestialId" },
        { status: 400 }
      );
    }

    const result = createBranch({ name, celestialId });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "BRANCH_CREATE_FAIL",
      },
      { status: 500 }
    );
  }
}
