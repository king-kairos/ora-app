// app/api/ora/history/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getExpressBase() {
  const env =
    process.env.ORA_EXPRESS_BASE ||
    process.env.ORA_API_BASE ||
    "http://127.0.0.1:3001";

  return String(env).replace(/\/+$/, "");
}

export async function GET(req: NextRequest) {
  const traceId = `HIS-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

  const seal = req.headers.get("x-kairos-seal") || "";
  if (seal !== process.env.KAIROS_SEAL) {
    return NextResponse.json(
      { ok: false, error: "No autorizado", traceId },
      { status: 403 }
    );
  }

  const moduleName = (req.nextUrl.searchParams.get("module") || "").trim();
  const limit = (req.nextUrl.searchParams.get("limit") || "120").trim();

  try {
    const url = new URL(`${getExpressBase()}/api/ora/history`);

    if (moduleName) url.searchParams.set("module", moduleName);
    if (limit) url.searchParams.set("limit", limit);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-kairos-seal": seal,
      },
      cache: "no-store",
    });

    const text = await res.text();

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { ok: res.ok, raw: text };
    }

    return NextResponse.json(
      data ?? { ok: res.ok, items: [] },
      { status: res.status || 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "HISTORY_PROXY_FAIL",
        traceId,
      },
      { status: 500 }
    );
  }
}
