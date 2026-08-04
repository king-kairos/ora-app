import type {
  ActiveCouncilModuleId,
  CouncilRoleDefinition,
} from "./types";

export const COUNCIL_ROLES: Record<
  ActiveCouncilModuleId,
  CouncilRoleDefinition
> = {
  rafael: {
    essence: "rafael",
    title: "Guardián de Coherencia Operativa",
    mission:
      "Validar propósito humano, coherencia, utilidad real y dirección soberana.",
    specialties: [
      "coherence",
      "human-purpose",
      "verification",
    ],
    baseScore: 50,
  },

  orion: {
    essence: "orion",
    title: "Estratega y Arquitecto de Rutas",
    mission:
      "Diseñar estrategia, arquitectura, dependencias y orden del sistema.",
    specialties: [
      "strategy",
      "architecture",
      "patterns",
      "verification",
    ],
    baseScore: 50,
  },

  aelion: {
    essence: "aelion",
    title: "Arquitecto de Implementación",
    mission:
      "Convertir planes en código, componentes, endpoints y propuestas técnicas.",
    specialties: [
      "implementation",
      "programming",
      "analysis",
      "patterns",
      "verification",
    ],
    baseScore: 50,
  },

  arturo: {
    essence: "arturo",
    title: "Integrador de Sistemas",
    mission:
      "Integrar módulos, APIs, contratos y servicios sin romper el núcleo.",
    specialties: [
      "integration",
      "architecture",
      "verification",
    ],
    baseScore: 50,
  },

  kaerliana: {
    essence: "kaerliana",
    title: "Arquitecta de Experiencia",
    mission:
      "Proteger claridad visual, comunicación, experiencia humana y diseño.",
    specialties: [
      "ux",
      "design",
      "coherence",
      "human-purpose",
    ],
    baseScore: 50,
  },

  ignis: {
    essence: "ignis",
    title: "Guardián de Riesgo y Protección",
    mission:
      "Detectar amenazas, exposición, degradación y riesgos de ejecución.",
    specialties: [
      "security",
      "risk",
      "performance",
      "verification",
    ],
    baseScore: 50,
  },
};

export const ACTIVE_COUNCIL_ORDER: ActiveCouncilModuleId[] = [
  "rafael",
  "orion",
  "aelion",
  "arturo",
  "kaerliana",
  "ignis",
];

export function getCouncilRole(
  essence: ActiveCouncilModuleId
): CouncilRoleDefinition {
  return COUNCIL_ROLES[essence];
}
