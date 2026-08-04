import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      eventType,
      confidence,
      location,
      zone,
    } = body;

    let risk = "bajo";

    if (confidence >= 90) {
      risk = "alto";
    } else if (confidence >= 70) {
      risk = "medio";
    }

    const requiresHuman =
      risk === "alto";

    return NextResponse.json({
      ok: true,

      observer: "ORA Security Observer",

      analysis: {
        eventType,
        confidence,
        location,
        zone,

        risk,

        requiresHuman,

        recommendation:
          risk === "alto"
            ? "Revisar inmediatamente"
            : risk === "medio"
            ? "Monitorear actividad"
            : "Actividad considerada estable",
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: "analysis_error",
      },
      {
        status: 500,
      }
    );
  }
}
