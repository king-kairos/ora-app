import {
  registerSecurityEvent,
  listSecurityEvents,
} from "@/ora/security/eventMemory";

import {
  NextRequest,
  NextResponse,
} from "next/server";

export async function GET() {
  return NextResponse.json(
    listSecurityEvents()
  );
}

export async function POST(
  req: NextRequest
) {
  try {
    const body = await req.json();

    const result =
      registerSecurityEvent({
        source:
          body.source ||
          "system",
        location:
          body.location ||
          "unknown",
        zone:
          body.zone ||
          "unknown",
        eventType:
          body.eventType ||
          "unknown_event",
        confidence:
          body.confidence,
        notes: body.notes,
      });

    return NextResponse.json(
      result
    );
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
