import type {
  ActiveCouncilModuleId,
} from "./types";

export type StrategicTaskKindLike =
  | "analysis"
  | "types"
  | "data"
  | "api"
  | "component"
  | "page"
  | "integration"
  | "verification";

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

/**
 * Resuelve el especialista responsable de una tarea.
 *
 * El líder estratégico del plan se conserva como fallback,
 * pero la ejecución se distribuye por especialidad.
 */
export function resolveTaskLeader(
  kind: StrategicTaskKindLike,
  intent: string,
  strategicLeader: string
): ActiveCouncilModuleId {
  const text = normalize(intent);

  const securityIntent = hasAny(text, [
    "seguridad",
    "security",
    "vulnerabilidad",
    "autenticacion",
    "auth",
    "permiso",
    "sello",
    "secret",
    "riesgo",
    "amenaza",
  ]);

  const humanIntent = hasAny(text, [
    "persona",
    "personas",
    "humano",
    "bienestar",
    "presencia",
    "salud",
    "paciente",
    "comunidad",
    "emocion",
    "coherencia",
    "proposito",
  ]);

  if (securityIntent && kind === "verification") {
    return "ignis";
  }

  switch (kind) {
    case "analysis":
      return "orion";

    case "types":
      return "aelion";

    case "data":
      return "orion";

    case "api":
      return securityIntent ? "ignis" : "arturo";

    case "component":
      return humanIntent ? "kaerliana" : "aelion";

    case "page":
      return humanIntent ? "kaerliana" : "aelion";

    case "integration":
      return "arturo";

    case "verification":
      return "ignis";

    default: {
      const fallback = normalize(strategicLeader);

      if (
        fallback === "rafael" ||
        fallback === "kaerliana" ||
        fallback === "orion" ||
        fallback === "arturo" ||
        fallback === "ignis" ||
        fallback === "aelion"
      ) {
        return fallback;
      }

      return "rafael";
    }
  }
}
