import {
  readAlerts,
  writeAlerts,
} from "@/lib/securityMemory";

export type SecurityAlert = {
  id: string;
  level: "bajo" | "medio" | "alto";
  title: string;
  location: string;
  zone: string;
  timestamp: string;
};

export function registerSecurityAlert(
  alert: Omit<SecurityAlert, "id" | "timestamp">
) {
  const alerts = readAlerts() as SecurityAlert[];

  const fullAlert: SecurityAlert = {
    id: `alert_${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...alert,
  };

  alerts.push(fullAlert);
  writeAlerts(alerts);

  return {
    ok: true,
    alert: fullAlert,
    totalAlerts: alerts.length,
  };
}

export function listSecurityAlerts() {
  const alerts = readAlerts() as SecurityAlert[];

  return {
    ok: true,
    totalAlerts: alerts.length,
    alerts,
  };
}

export function clearSecurityAlerts() {
  writeAlerts([]);

  return {
    ok: true,
    cleared: true,
  };
}
