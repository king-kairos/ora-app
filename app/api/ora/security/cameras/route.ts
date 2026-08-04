import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    branch: "ora-security",
    cameras: [
      {
        id: "cam_001",
        name: "Entrada Principal",
        zone: "Entrada",
        status: "online",
        recording: true,
      },
      {
        id: "cam_002",
        name: "Caja Principal",
        zone: "Caja Principal",
        status: "online",
        recording: true,
      },
    ],
  });
}
