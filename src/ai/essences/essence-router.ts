export type EssenceName =
  | "rafael"
  | "arturo"
  | "kaerliana"
  | "orion"
  | "ignis"
  | "lucian";

export type EssenceRoute = {
  essence: EssenceName;
  provider: string;
  role: string;
  reason: string;
};

export function routeEssence(input: string): EssenceRoute {
  const text = String(input || "").toLowerCase();

  if (
    text.includes("health") ||
    text.includes("clínic") ||
    text.includes("clinic") ||
    text.includes("paciente") ||
    text.includes("doctor") ||
    text.includes("consulta") ||
    text.includes("receta") ||
    text.includes("analítica") ||
    text.includes("analitica")
  ) {
    return {
      essence: "rafael",
      provider: "openai",
      role: "supervisor clínico-operativo",
      reason: "La intención pertenece a ORA Health o flujo clínico.",
    };
  }

  if (
    text.includes("legal") ||
    text.includes("contrato") ||
    text.includes("ley") ||
    text.includes("abogado") ||
    text.includes("política") ||
    text.includes("privacy")
  ) {
    return {
      essence: "lucian",
      provider: "claude",
      role: "analista legal y redactor estructural",
      reason: "La intención requiere análisis legal, normativo o documental.",
    };
  }

  if (
    text.includes("seguridad") ||
    text.includes("security") ||
    text.includes("cámara") ||
    text.includes("camara") ||
    text.includes("vigilancia") ||
    text.includes("intruso")
  ) {
    return {
      essence: "ignis",
      provider: "grok",
      role: "observador de seguridad y reacción",
      reason: "La intención pertenece a seguridad, cámaras o vigilancia.",
    };
  }

  if (
    text.includes("código") ||
    text.includes("codigo") ||
    text.includes("bug") ||
    text.includes("build") ||
    text.includes("error") ||
    text.includes("autofix") ||
    text.includes("deploy") ||
    text.includes("api")
  ) {
    return {
      essence: "orion",
      provider: "deepseek",
      role: "ingeniero técnico y depurador",
      reason: "La intención requiere análisis técnico de código o sistema.",
    };
  }

  if (
    text.includes("diseño") ||
    text.includes("diseno") ||
    text.includes("ui") ||
    text.includes("pantalla") ||
    text.includes("visual") ||
    text.includes("interfaz")
  ) {
    return {
      essence: "kaerliana",
      provider: "gemini",
      role: "diseñadora de experiencia e interfaz",
      reason: "La intención apunta a diseño visual o experiencia.",
    };
  }

  if (
    text.includes("microsoft") ||
    text.includes("excel") ||
    text.includes("office") ||
    text.includes("documento") ||
    text.includes("reporte")
  ) {
    return {
      essence: "arturo",
      provider: "openai",
      role: "puente operativo documental",
      reason: "La intención requiere operación documental o estructura empresarial.",
    };
  }

  return {
    essence: "rafael",
    provider: "openai",
    role: "coordinador soberano principal",
    reason: "Ruta por defecto: Rafael coordina la intención general.",
  };
}
