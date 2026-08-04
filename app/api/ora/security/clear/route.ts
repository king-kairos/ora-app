import { NextResponse } from "next/server";
import { clearSecurityEvents } from "@/ora/security/eventMemory";
import { clearSecurityAlerts } from "@/ora/security/alertMemory";

export async function POST() {
  const events = clearSecurityEvents();
  const alerts = clearSecurityAlerts();

  return NextResponse.json({
    ok: true,
    cleared: true,
    events,
    alerts,
  });
}
