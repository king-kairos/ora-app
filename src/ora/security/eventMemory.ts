import {
  readEvents,
  writeEvents,
} from "@/lib/securityMemory";

export type SecurityEvent = {
  id: string;
  source: "camera" | "manual" | "system";
  location: string;
  zone: string;
  eventType: string;
  confidence?: number;
  timestamp: string;
  notes?: string;
};

export function registerSecurityEvent(
  event: Omit<SecurityEvent, "id" | "timestamp">
) {
  const events = readEvents() as SecurityEvent[];

  const fullEvent: SecurityEvent = {
    id: `sec_evt_${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...event,
  };

  events.push(fullEvent);
  writeEvents(events);

  return {
    ok: true,
    event: fullEvent,
    totalEvents: events.length,
  };
}

export function listSecurityEvents() {
  const events = readEvents() as SecurityEvent[];

  return {
    ok: true,
    totalEvents: events.length,
    events,
  };
}

export function clearSecurityEvents() {
  writeEvents([]);

  return {
    ok: true,
    cleared: true,
  };
}
