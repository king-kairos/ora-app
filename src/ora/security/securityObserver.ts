import { SecurityEvent } from "./eventMemory";

export function analyzeSecurityEvent(event: SecurityEvent) {
  const risk =
    event.confidence && event.confidence >= 90
      ? "alto"
      : event.confidence && event.confidence >= 70
      ? "medio"
      : "bajo";

  return {
    ok: true,
    observer: "ORA Security Observer",
    branch: "ora-security",
    nucleusAccess: false,
    sealRequiredForCoreExecution: true,
    eventId: event.id,
    location: event.location,
    zone: event.zone,
    eventType: event.eventType,
    risk,
    recommendation:
      risk === "alto"
        ? "Revisar evento y marcar como alerta activa."
        : "Registrar patrón y continuar observación.",
  };
}
