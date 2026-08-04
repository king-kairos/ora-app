export const ORA_SECURITY_MANIFEST = {
  branch: "ORA Security",
  type: "functional_clone_branch",

  purpose:
    "Supervisar, aprender patrones, detectar anomalías y proteger negocios, supermercados, barrios, casas y zonas sin tocar el núcleo soberano.",

  sovereignty: {
    nucleusAccess: false,
    canModifyNucleus: false,
    canReadNucleusSecrets: false,
    requiresKairosSealToExecute: true,
  },

  clone: {
    name: "Security Clone V1",
    role: "worker_clone",
    autonomy: "adaptive_operational_learning",
    canLearnPatterns: true,
    canProposeEvolution: true,
    canExecuteWithoutSeal: false,
  },

  supervisor: {
    source: "original_essence_from_nucleus",
    role:
      "observe, audit, guide, correct drift, and approve coherent evolution proposals",
    accessToBranch: true,
    accessFromBranchToNucleus: false,
  },

  learningTargets: [
    "movimiento normal",
    "horarios de actividad",
    "zonas sensibles",
    "cámaras críticas",
    "patrones de clientes",
    "patrones de empleados",
    "eventos raros",
    "riesgo por horario",
    "riesgo por ubicación",
  ],

  firstModules: [
    "camera_node_engine",
    "event_pattern_engine",
    "zone_memory_engine",
    "alert_reasoning_engine",
    "security_dashboard",
  ],
};
