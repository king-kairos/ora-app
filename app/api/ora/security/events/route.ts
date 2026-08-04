import {
  registerSecurityEvent,
  listSecurityEvents,
} from "@/ora/security/eventMemory";

import { analyzeSecurityEvent } from "@/ora/security/securityObserver";

import {
  registerSecurityAlert,
} from "@/ora/security/alertMemory";

import {
  NextRequest,
  NextResponse,
} from "next/server";

export async function GET() {
  return NextResponse.json(listSecurityEvents());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = registerSecurityEvent({
      source: body.source || "system",
      location: body.location || "unknown",
      zone: body.zone || "unknown",
      eventType: body.eventType || "unknown_event",
      confidence: body.confidence,
      notes: body.notes,
    });

    const analysis = analyzeSecurityEvent(result.event);

    let alertResult = null;

    if (analysis.risk === "alto") {
      alertResult = registerSecurityAlert({
        level: "alto",
        title: `Alerta crítica: ${result.event.eventType}`,
        location: result.event.location,
        zone: result.event.zone,
      });
    }

    return NextResponse.json({
      ...result,
      analysis,
      alert: alertResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
