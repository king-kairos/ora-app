import { NextResponse } from "next/server";
import { registerSecurityEvent } from "@/ora/security/eventMemory";
import { analyzeSecurityEvent } from "@/ora/security/securityObserver";
import { registerSecurityAlert } from "@/ora/security/alertMemory";

export async function POST() {
  const result = registerSecurityEvent({
    source: "camera",
    location: "Supermercado ORA",
    zone: "Caja Principal",
    eventType: "movimiento_detectado",
    confidence: 95,
    notes: "Evento simulado desde ORA Security",
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
    ok: true,
    simulated: true,
    event: result.event,
    analysis,
    alert: alertResult,
  });
}
