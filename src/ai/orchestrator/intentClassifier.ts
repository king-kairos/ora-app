export type IntentKind =
  | "engine"
  | "infrastructure"
  | "business_branch"
  | "ui"
  | "api"
  | "security"
  | "bug"
  | "refactor"
  | "data"
  | "automation"
  | "general";

export type IntentScope =
  | "strategic-core"
  | "branch"
  | "interface"
  | "service"
  | "system";

export type IntentClassification = {
  kind: IntentKind;
  scope: IntentScope;
  domain: string;
  branchCandidate: string | null;
  confidence: number;
  reasons: string[];
};

function normalize(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) =>
    text.includes(normalize(word))
  );
}

export function classifyIntent(
  intent: string
): IntentClassification {
  const text = normalize(intent);

  const internalEngine = hasAny(text, [
    "intent classifier",
    "clasificador de intencion",
    "branch name engine",
    "branch awareness",
    "target resolver",
    "proposal generation engine",
    "council engine",
    "essence router",
    "strategic planner",
    "cerebro estrategico",
    "motor interno",
    "motor del sistema",
    "crear engine",
    "crear un engine",
    "crear motor",
    "crear un motor",
  ]);

  if (internalEngine) {
    return {
      kind: "engine",
      scope: "strategic-core",
      domain: "strategic-core",
      branchCandidate: null,
      confidence: 97,
      reasons: [
        "La intención solicita crear o evolucionar un motor interno.",
        "Las ramas mencionadas como ejemplos no definen el destino.",
        "El cambio pertenece al núcleo estratégico de ORA.",
      ],
    };
  }

  if (
    hasAny(text, [
      "infraestructura",
      "infrastructure",
      "orquestador",
      "orchestrator",
      "arquitectura interna",
      "nucleo",
      "core",
    ])
  ) {
    return {
      kind: "infrastructure",
      scope: "strategic-core",
      domain: "strategic-core",
      branchCandidate: null,
      confidence: 93,
      reasons: [
        "La intención modifica infraestructura compartida.",
        "No corresponde a una rama de negocio.",
      ],
    };
  }

  if (
    hasAny(text, [
      "bug",
      "error",
      "falla",
      "fallo",
      "no funciona",
      "corregir",
      "arreglar",
      "fix",
    ])
  ) {
    return {
      kind: "bug",
      scope: "system",
      domain: "maintenance",
      branchCandidate: null,
      confidence: 92,
      reasons: [
        "La intención describe una falla o corrección.",
        "Debe localizarse la implementación existente.",
      ],
    };
  }

  const branches = [
    {
      branch: "security",
      words: [
        "ora security",
        "seguridad",
        "security",
        "vigilancia",
        "camaras",
      ],
    },
    {
      branch: "pollera",
      words: [
        "ora pollera",
        "pollera",
        "pollos",
        "produccion de pollos",
      ],
    },
    {
      branch: "agriculture",
      words: [
        "ora agriculture",
        "agriculture",
        "agricultura",
        "cultivo",
        "riego",
      ],
    },
    {
      branch: "health",
      words: [
        "ora health",
        "salud",
        "pacientes",
        "clinica",
      ],
    },
    {
      branch: "presence",
      words: [
        "ora presence",
        "presencia",
        "bienestar emocional",
      ],
    },
    {
      branch: "marketing",
      words: [
        "ora marketing",
        "marketing",
        "campanas",
        "leads",
      ],
    },
    {
      branch: "library",
      words: [
        "ora biblioteca",
        "biblioteca",
        "manuales",
        "documentos pdf",
      ],
    },
  ];

  for (const item of branches) {
    if (hasAny(text, item.words)) {
      return {
        kind:
          item.branch === "security"
            ? "security"
            : "business_branch",
        scope: "branch",
        domain: item.branch,
        branchCandidate: item.branch,
        confidence: 94,
        reasons: [
          `La intención pertenece a la rama ${item.branch}.`,
          "Debe comprobarse si la rama ya existe.",
        ],
      };
    }
  }

  if (
    hasAny(text, [
      "automatizar",
      "automatizacion",
      "automation",
      "worker",
      "cron",
    ])
  ) {
    return {
      kind: "automation",
      scope: "system",
      domain: "automation",
      branchCandidate: null,
      confidence: 90,
      reasons: [
        "La intención solicita coordinación automática.",
      ],
    };
  }

  if (
    hasAny(text, [
      "endpoint",
      "ruta api",
      "webhook",
      "servicio backend",
    ])
  ) {
    return {
      kind: "api",
      scope: "service",
      domain: "api",
      branchCandidate: null,
      confidence: 89,
      reasons: [
        "La intención se concentra en servicios API.",
      ],
    };
  }

  if (
    hasAny(text, [
      "interfaz",
      "dashboard",
      "componente",
      "pagina",
      "ui",
      "ux",
    ])
  ) {
    return {
      kind: "ui",
      scope: "interface",
      domain: "interface",
      branchCandidate: null,
      confidence: 87,
      reasons: [
        "La intención se concentra en interfaz.",
      ],
    };
  }

  return {
    kind: "general",
    scope: "system",
    domain: "general",
    branchCandidate: null,
    confidence: 65,
    reasons: [
      "No se detectó una categoría dominante.",
    ],
  };
}

export function coreTargetsForIntent(
  classification: IntentClassification,
  intent: string
): string[] {
  if (classification.scope !== "strategic-core") {
    return [];
  }

  const text = normalize(intent);

  const targets = [
    "src/ai/orchestrator/intentClassifier.ts",
    "src/ai/orchestrator/proposalGenerationEngine.ts",
  ];

  if (
    text.includes("branch") ||
    text.includes("rama")
  ) {
    targets.push(
      "src/ai/autoprog/branchAwarenessEngine.ts",
      "src/ai/autoprog/dynamicBranchGenerator.ts",
      "src/kairos/target-resolver/engine.ts"
    );
  }

  if (
    text.includes("council") ||
    text.includes("consejo") ||
    text.includes("lider")
  ) {
    targets.push(
      "src/ai/council-engine/evaluator.ts",
      "src/ai/council-engine/types.ts"
    );
  }

  if (
    text.includes("planner") ||
    text.includes("cerebro estrategico")
  ) {
    targets.push(
      "src/kairos/strategic-planner/engine.ts",
      "src/kairos/strategic-planner/types.ts"
    );
  }

  return Array.from(new Set(targets));
}
