export const BRANCH_TARGETS = {
  presence: [
    "app/presence/page.tsx",
    "app/presence/components/PresenceDashboard.tsx",
    "app/presence/components/StatsPanel.tsx",
    "app/presence/components/EventsPanel.tsx",
    "app/presence/components/ControlPanel.tsx",
    "app/api/presence/state/route.ts",
    "src/presence/types.ts",
    "src/presence/mockData.ts",
  ],

  marketing: [
    "app/marketing/page.tsx",
    "app/marketing/components/MarketingDashboard.tsx",
    "app/marketing/components/StatsPanel.tsx",
    "app/marketing/components/EventsPanel.tsx",
    "app/marketing/components/ControlPanel.tsx",
    "app/api/marketing/state/route.ts",
    "src/marketing/types.ts",
    "src/marketing/mockData.ts",
  ],

  pollera: [
    "app/pollera/page.tsx",
    "app/pollera/components/PolleraDashboard.tsx",
    "app/pollera/components/ProductionPanel.tsx",
    "app/pollera/components/InventoryPanel.tsx",
    "app/pollera/components/OrdersPanel.tsx",
    "app/api/pollera/production/route.ts",
    "app/api/pollera/inventory/route.ts",
    "src/pollera/types.ts",
    "src/pollera/mockData.ts",
  ],

  agriculture: [
    "app/agriculture/page.tsx",
    "app/agriculture/components/AgricultureDashboard.tsx",
    "app/agriculture/components/CropPanel.tsx",
    "app/agriculture/components/SensorPanel.tsx",
    "app/agriculture/components/IrrigationPanel.tsx",
    "app/api/agriculture/crops/route.ts",
    "app/api/agriculture/sensors/route.ts",
    "src/agriculture/types.ts",
    "src/agriculture/mockData.ts",
  ],

  health: [
    "app/health/page.tsx",
    "app/health/components/HealthDashboard.tsx",
    "app/health/components/PatientPanel.tsx",
    "app/health/components/ConsultationPanel.tsx",
    "app/health/components/AlertPanel.tsx",
    "app/api/health/patients/route.ts",
    "app/api/health/consultations/route.ts",
    "src/health/types.ts",
    "src/health/mockData.ts",
  ],

  security: [
    "app/security/page.tsx",
    "app/security/components/SecurityDashboard.tsx",
    "app/security/components/CameraGrid.tsx",
    "app/security/components/AlertPanel.tsx",
    "app/security/components/ZoneMap.tsx",
    "app/api/security/cameras/route.ts",
    "app/api/security/events/route.ts",
    "src/security/types.ts",
    "src/security/mockData.ts",
  ],
} as const;

export type SovereignBranch = keyof typeof BRANCH_TARGETS;
