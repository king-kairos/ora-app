export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readOperation } from "@/kairos/orchestrator/engine";

function validSeal(req: Request) {
  const expected = String(process.env.KAIROS_SEAL || "").trim();
  if (!expected) return true;

  const received = String(
    req.headers.get("x-kairos-seal") || ""
  ).trim();

  return received === expected;
}

export async function GET(req: Request) {
  if (!validSeal(req)) {
    return NextResponse.json(
      { ok: false, error: "SELLO_INVALIDO" },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const operationId = String(
    url.searchParams.get("operationId") || ""
  ).trim();

  if (!operationId) {
    return NextResponse.json(
      { ok: false, error: "OPERATION_ID_REQUIRED" },
      { status: 400 }
    );
  }

  const operation = await readOperation(operationId);

  if (!operation) {
    return NextResponse.json(
      { ok: false, error: "OPERATION_NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "KAIROS_ORCHESTRATOR_STATUS",
    operation,
  });
}
