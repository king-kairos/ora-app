import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    branch: "marketing",
    state: {
      campaigns: [],
      leads: [],
      clients: [],
      events: [
        "ORA Marketing inicializado",
        "Esperando datos reales de campañas"
      ]
    }
  });
}
