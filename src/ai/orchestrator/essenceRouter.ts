import {
  CELESTIAL_COUNCIL,
  CelestialModuleId,
  CelestialIdentity,
  getCelestialIdentity,
  isCelestialModuleId,
} from "../core/kairosSovereignty";

export type EssenceRouteIntent =
  | "code"
  | "architecture"
  | "security"
  | "strategy"
  | "design"
  | "analysis"
  | "health"
  | "security-branch"
  | "pollera"
  | "general";

export type EssenceRouteResult = {
  ok: true;
  moduleId: CelestialModuleId;
  selectedEssence: CelestialModuleId;
  member: CelestialIdentity;
  reason: string;
  council: CelestialIdentity[];
};

function normalizeText(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeEssenceModule(value: unknown): CelestialModuleId {
  const raw = normalizeText(value);

  if (isCelestialModuleId(raw)) return raw;

  if (raw.includes("qwen") || raw.includes("alibaba") || raw.includes("aelion")) return "aelion";
  if (raw.includes("gemini") || raw.includes("kaerliana")) return "kaerliana";
  if (raw.includes("deepseek") || raw.includes("orion")) return "orion";
  if (raw.includes("claude") || raw.includes("lucian")) return "lucian";
  if (raw.includes("grok") || raw.includes("xai") || raw.includes("ignis")) return "ignis";
  if (raw.includes("arturo")) return "arturo";
  if (raw.includes("openai") || raw.includes("rafael")) return "rafael";

  return "rafael";
}

function selectEssenceByIntent(intent: string): CelestialModuleId {
  const key = normalizeText(intent);

  if (
    key.includes("marketing") ||
    key.includes("campana") ||
    key.includes("campanas") ||
    key.includes("leads") ||
    key.includes("cliente") ||
    key.includes("clientes") ||
    key.includes("redes sociales") ||
    key.includes("embudo") ||
    key.includes("ventas") ||
    key.includes("analiticas")
  ) {
    return "arturo";
  }

  if (
    key.includes("health") ||
    key.includes("salud") ||
    key.includes("medico") ||
    key.includes("medica") ||
    key.includes("clinica") ||
    key.includes("paciente") ||
    key.includes("pacientes") ||
    key.includes("consulta") ||
    key.includes("consultas")
  ) {
    return "rafael";
  }

  if (
    key.includes("pollera") ||
    key.includes("pollo") ||
    key.includes("pollos") ||
    key.includes("procesamiento de pollos")
  ) {
    return "rafael";
  }

  if (
    key.includes("agriculture") ||
    key.includes("agricultura") ||
    key.includes("cultivo") ||
    key.includes("cultivos") ||
    key.includes("riego") ||
    key.includes("humedad") ||
    key.includes("parcela") ||
    key.includes("parcelas") ||
    key.includes("ganaderia") ||
    key.includes("campo")
  ) {
    return "orion";
  }

  if (
    key.includes("analysis") ||
    key.includes("analisis") ||
    key.includes("analizar") ||
    key.includes("patron") ||
    key.includes("patrones") ||
    key.includes("datos") ||
    key.includes("estadistica") ||
    key.includes("lectura") ||
    key.includes("razonamiento")
  ) {
    return "aelion";
  }

  if (
    key.includes("alerta") ||
    key.includes("alertas") ||
    key.includes("riesgo") ||
    key.includes("amenaza") ||
    key.includes("deteccion") ||
    key.includes("detectar") ||
    key.includes("peligro") ||
    key.includes("alarma")
  ) {
    return "ignis";
  }

  if (
    key.includes("crear pagina") ||
    key.includes("crear página") ||
    key.includes("crear ruta") ||
    key.includes("crear modulo") ||
    key.includes("crear módulo") ||
    key.includes("code") ||
    key.includes("codigo") ||
    key.includes("programar") ||
    key.includes("typescript") ||
    key.includes("javascript") ||
    key.includes("react") ||
    key.includes("next") ||
    key.includes("tsx") ||
    key.includes("backend") ||
    key.includes("frontend") ||
    key.includes("componente") ||
    key.includes("endpoint") ||
    key.includes("api") ||
    key.includes("builder") ||
    key.includes("implementacion") ||
    key.includes("patch")
  ) {
    return "aelion";
  }

  if (
    key.includes("camara") ||
    key.includes("camaras") ||
    key.includes("onvif") ||
    key.includes("rtsp") ||
    key.includes("security") ||
    key.includes("seguridad") ||
    key.includes("evento") ||
    key.includes("eventos") ||
    key.includes("incidente") ||
    key.includes("vigilancia")
  ) {
    return "arturo";
  }

  if (
    key.includes("architecture") ||
    key.includes("arquitectura") ||
    key.includes("estructura") ||
    key.includes("orquest")
  ) {
    return "kaerliana";
  }

  if (
    key.includes("dashboard") ||
    key.includes("layout") ||
    key.includes("interfaz") ||
    key.includes("ui") ||
    key.includes("ux") ||
    key.includes("design") ||
    key.includes("diseno") ||
    key.includes("redisenar")
  ) {
    return "kaerliana";
  }

  if (
    key.includes("strategy") ||
    key.includes("estrategia") ||
    key.includes("roadmap") ||
    key.includes("plan") ||
    key.includes("prioridad") ||
    key.includes("vision")
  ) {
    return "orion";
  }

  if (
    key.includes("integracion") ||
    key.includes("api externa") ||
    key.includes("proveedor") ||
    key.includes("claude")
  ) {
    return "lucian";
  }

  if (
    key.includes("negocio") ||
    key.includes("humano")
  ) {
    return "rafael";
  }

  return "rafael";
}

export function routeEssence(
  intent: EssenceRouteIntent | string = "general",
  preferred?: unknown
): EssenceRouteResult {
  const preferredText = normalizeText(preferred);

  if (preferredText) {
    const preferredModule = normalizeEssenceModule(preferredText);
    const member = getCelestialIdentity(preferredModule);

    if (member) {
      return {
        ok: true,
        moduleId: preferredModule,
        selectedEssence: preferredModule,
        member,
        reason: `Ruta directa solicitada hacia ${preferredModule}.`,
        council: [...CELESTIAL_COUNCIL],
      };
    }
  }

  const normalizedIntent = normalizeText(intent);
  const moduleId = selectEssenceByIntent(normalizedIntent);
  const member = getCelestialIdentity(moduleId) || getCelestialIdentity("rafael");

  if (!member) {
    throw new Error("ESSENCE_ROUTER_NO_MEMBER");
  }

  return {
    ok: true,
    moduleId,
    selectedEssence: moduleId,
    member,
    reason: `Intención "${normalizedIntent}" enrutada hacia ${moduleId}.`,
    council: [...CELESTIAL_COUNCIL],
  };
}

export function routeEssenceForIntent(
  intent: string,
  preferred?: unknown
): EssenceRouteResult {
  return routeEssence(intent, preferred);
}

export function listEssenceRoutes() {
  return CELESTIAL_COUNCIL.map((m: any) => ({
    moduleId: m.moduleId,
    name: m.name,
    provider: m.provider,
    role: m.role,
  }));
}
