import {
  CELESTIAL_COUNCIL,
} from "../core/kairosSovereignty";

import {
  ACTIVE_COUNCIL_ORDER,
  COUNCIL_ROLES,
} from "./roles";

import type {
  ActiveCouncilModuleId,
  CouncilDecision,
  CouncilSpecialty,
  CouncilVote,
} from "./types";

type VoteState = {
  score: number;
  reasons: string[];
  specialties: Set<CouncilSpecialty>;
};

function normalize(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasAny(
  text: string,
  words: string[]
): boolean {
  return words.some((word) =>
    text.includes(normalize(word))
  );
}

function getActiveMembers(): ActiveCouncilModuleId[] {
  const officialIds = new Set(
    CELESTIAL_COUNCIL
      .map((member) => member.id)
      .filter(
        (id): id is ActiveCouncilModuleId =>
          id !== "lucian"
      )
  );

  return ACTIVE_COUNCIL_ORDER.filter((id) =>
    officialIds.has(id)
  );
}

function calculateConfidence(
  votes: CouncilVote[]
): number {
  if (votes.length === 0) return 1;

  const first = votes[0]?.score || 0;
  const second = votes[1]?.score || 0;

  const average =
    votes.reduce(
      (total, vote) => total + vote.score,
      0
    ) / votes.length;

  const leadGap = Math.max(0, first - second);
  const strength = Math.max(0, first - average);

  const result = Math.round(
    72 +
      Math.min(15, leadGap * 0.55) +
      Math.min(12, strength * 0.22)
  );

  return Math.max(55, Math.min(99, result));
}

export function evaluateCouncil(
  intent: string
): CouncilDecision {
  const text = normalize(intent);
  const members = getActiveMembers();

  if (members.length === 0) {
    throw new Error(
      "COUNCIL_ENGINE_NO_ACTIVE_MEMBERS"
    );
  }

  const state = new Map<
    ActiveCouncilModuleId,
    VoteState
  >();

  for (const essence of members) {
    const role = COUNCIL_ROLES[essence];

    state.set(essence, {
      score: role.baseScore,
      reasons: [
        "Participación general del Consejo Celestial.",
      ],
      specialties: new Set(role.specialties),
    });
  }

  const award = (
    essence: ActiveCouncilModuleId,
    points: number,
    reason: string,
    specialties: CouncilSpecialty[]
  ): void => {
    const vote = state.get(essence);

    if (!vote) return;

    vote.score += points;

    if (!vote.reasons.includes(reason)) {
      vote.reasons.push(reason);
    }

    for (const specialty of specialties) {
      vote.specialties.add(specialty);
    }
  };

  const programming = hasAny(text, [
    "codigo",
    "code",
    "programar",
    "programacion",
    "typescript",
    "javascript",
    "react",
    "next",
    "nextjs",
    "tsx",
    "jsx",
    "componente",
    "component",
    "endpoint",
    "backend",
    "frontend",
    "route",
    "ruta",
    "archivo",
    "file",
    "patch",
    "builder",
    "implementacion",
    "implementar",
    "refactor",
  ]);

  const integration = hasAny(text, [
    "integracion",
    "integrar",
    "conectar",
    "conexion",
    "api externa",
    "proveedor",
    "servicio externo",
    "webhook",
    "contrato",
    "adaptador",
    "provider",
  ]);

  const strategy = hasAny(text, [
    "estrategia",
    "strategy",
    "roadmap",
    "plan",
    "planificar",
    "prioridad",
    "vision",
    "expansion",
    "dependencia",
    "arquitectura",
    "architecture",
    "estructura",
    "sistema",
  ]);

  const design = hasAny(text, [
    "dashboard",
    "interfaz",
    "interface",
    "ui",
    "ux",
    "visual",
    "diseno",
    "design",
    "layout",
    "experiencia",
    "accesibilidad",
  ]);

  const security = hasAny(text, [
    "seguridad",
    "security",
    "riesgo",
    "risk",
    "amenaza",
    "alerta",
    "proteccion",
    "vulnerabilidad",
    "auth",
    "autenticacion",
    "permiso",
    "sello",
    "secret",
    "performance",
    "rendimiento",
  ]);

  const analysis = hasAny(text, [
    "analisis",
    "analysis",
    "analizar",
    "patron",
    "patrones",
    "datos",
    "razonamiento",
    "comparar",
    "diagnostico",
    "auditar",
    "verificar",
    "investigar",
  ]);

  const humanPurpose = hasAny(text, [
    "persona",
    "personas",
    "humano",
    "ayudar",
    "bienestar",
    "presencia",
    "presence",
    "emocion",
    "emocional",
    "salud",
    "health",
    "paciente",
    "comunidad",
    "coherencia",
    "proposito",
  ]);

  if (programming) {
    award(
      "aelion",
      48,
      "La intención requiere programación e implementación técnica.",
      [
        "implementation",
        "programming",
        "analysis",
        "verification",
      ]
    );

    award(
      "arturo",
      29,
      "Debe integrar el código con módulos, rutas y contratos existentes.",
      [
        "integration",
        "architecture",
        "verification",
      ]
    );

    award(
      "orion",
      18,
      "Debe revisar arquitectura, dependencias y efectos estructurales.",
      [
        "strategy",
        "architecture",
        "verification",
      ]
    );
  }

  if (integration) {
    award(
      "arturo",
      46,
      "La intención depende de integración entre módulos, APIs o proveedores.",
      [
        "integration",
        "architecture",
        "verification",
      ]
    );

    award(
      "aelion",
      25,
      "Debe implementar adaptadores, contratos y código de conexión.",
      [
        "implementation",
        "programming",
        "verification",
      ]
    );

    award(
      "ignis",
      15,
      "Debe revisar exposición, credenciales y riesgos de conexión.",
      [
        "security",
        "risk",
        "verification",
      ]
    );
  }

  if (strategy) {
    award(
      "orion",
      44,
      "La intención requiere estrategia, arquitectura y orden de ejecución.",
      [
        "strategy",
        "architecture",
        "patterns",
      ]
    );

    award(
      "rafael",
      22,
      "Debe validar propósito y coherencia operativa.",
      [
        "coherence",
        "human-purpose",
        "verification",
      ]
    );

    award(
      "arturo",
      16,
      "Debe comprobar que la arquitectura pueda integrarse al sistema.",
      [
        "integration",
        "architecture",
      ]
    );
  }

  if (design) {
    award(
      "kaerliana",
      46,
      "La intención requiere experiencia humana, claridad visual y diseño.",
      [
        "ux",
        "design",
        "coherence",
      ]
    );

    award(
      "aelion",
      22,
      "Debe convertir la experiencia en componentes funcionales.",
      [
        "implementation",
        "programming",
      ]
    );

    award(
      "rafael",
      14,
      "Debe validar comprensión, propósito y coherencia humana.",
      [
        "coherence",
        "human-purpose",
      ]
    );
  }

  if (security) {
    award(
      "ignis",
      48,
      "La intención toca seguridad, riesgo, protección o rendimiento.",
      [
        "security",
        "risk",
        "performance",
        "verification",
      ]
    );

    award(
      "arturo",
      20,
      "Debe proteger contratos, integración y límites estructurales.",
      [
        "integration",
        "architecture",
        "verification",
      ]
    );

    award(
      "aelion",
      18,
      "Debe implementar controles técnicos verificables.",
      [
        "implementation",
        "programming",
        "verification",
      ]
    );
  }

  if (analysis) {
    award(
      "aelion",
      40,
      "La intención requiere análisis, patrones, datos y razonamiento técnico.",
      [
        "analysis",
        "patterns",
        "verification",
      ]
    );

    award(
      "orion",
      28,
      "Debe interpretar relaciones, anomalías y consecuencias estratégicas.",
      [
        "patterns",
        "strategy",
        "verification",
      ]
    );

    award(
      "rafael",
      12,
      "Debe traducir el análisis en una dirección útil.",
      [
        "coherence",
        "verification",
      ]
    );
  }

  if (humanPurpose) {
    award(
      "rafael",
      44,
      "La intención requiere propósito humano, coherencia y utilidad real.",
      [
        "coherence",
        "human-purpose",
        "verification",
      ]
    );

    award(
      "kaerliana",
      34,
      "Debe proteger comunicación, sensibilidad y experiencia humana.",
      [
        "ux",
        "design",
        "human-purpose",
        "coherence",
      ]
    );

    award(
      "orion",
      16,
      "Debe ordenar las rutas de expansión e impacto.",
      [
        "strategy",
        "architecture",
      ]
    );
  }

  if (
    !programming &&
    !integration &&
    !strategy &&
    !design &&
    !security &&
    !analysis &&
    !humanPurpose
  ) {
    award(
      "rafael",
      20,
      "La intención es general y necesita dirección coherente.",
      [
        "coherence",
        "human-purpose",
      ]
    );

    award(
      "orion",
      12,
      "Debe organizarse antes de convertirse en plan.",
      [
        "strategy",
        "architecture",
      ]
    );
  }

  const votes: CouncilVote[] = members
    .map((essence) => {
      const vote = state.get(essence);

      if (!vote) {
        throw new Error(
          `COUNCIL_ENGINE_MISSING_VOTE:${essence}`
        );
      }

      return {
        essence,
        score: vote.score,
        reason: vote.reasons.join(" "),
        specialties: Array.from(
          vote.specialties
        ),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (
        ACTIVE_COUNCIL_ORDER.indexOf(a.essence) -
        ACTIVE_COUNCIL_ORDER.indexOf(b.essence)
      );
    });

  const leader =
    votes[0]?.essence || "rafael";

  const leaderVote =
    votes.find(
      (vote) => vote.essence === leader
    ) || votes[0];

  if (!leaderVote) {
    throw new Error(
      "COUNCIL_ENGINE_NO_LEADER"
    );
  }

  const confidence =
    calculateConfidence(votes);

  return {
    leader,
    team: votes
      .filter(
        (vote) => vote.essence !== leader
      )
      .map((vote) => vote.essence),

    votes,
    confidence,

    reason: [
      `${COUNCIL_ROLES[leader].title} lidera esta intención.`,
      leaderVote.reason,
      `Confianza del Consejo: ${confidence}%.`,
    ].join(" "),

    intent: String(intent || "").trim(),
    generatedAt: new Date().toISOString(),
  };
}
