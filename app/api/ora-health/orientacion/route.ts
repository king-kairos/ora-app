import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pregunta = String(body?.pregunta || "").trim();
    const pacienteId = body?.pacienteId ? String(body.pacienteId).trim() : null;

    if (!pregunta) {
      return NextResponse.json(
        { ok: false, error: "PREGUNTA_VACIA" },
        { status: 400 }
      );
    }

    const base =
      process.env.ORA_CORE_URL ||
      process.env.NEXT_PUBLIC_ORA_CORE_URL ||
      "http://127.0.0.1:3001";

    const seal = String(process.env.KAIROS_SEAL || "").trim();

    if (!seal) {
      return NextResponse.json(
        { ok: false, error: "KAIROS_SEAL_MISSING" },
        { status: 500 }
      );
    }

    const r = await fetch(`${base}/api/ora-health/orientacion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-kairos-seal": seal,
      },
      body: JSON.stringify({
        pregunta,
        pacienteId,
      }),
      cache: "no-store",
    });

    const text = await r.text();

    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { ok: false, raw: text };
    }

    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "ORA_HEALTH_ORIENTACION_PROXY_FAIL",
      },
      { status: 500 }
    );
  }
}
