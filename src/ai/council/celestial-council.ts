type CelestialId = "rafael" | "kaerliana" | "orion" | "arturo";

type CouncilMember = {
  id: CelestialId;
  name: string;
  role: string;
};

type CouncilInput = {
  topic: string;
  branch?: string;
  objective?: string;
};

type CouncilVote = {
  memberId: CelestialId;
  memberName: string;
  role: string;
  opinion: string;
};

type CouncilResult = {
  ok: true;
  topic: string;
  branch: string | null;
  objective: string | null;
  votes: CouncilVote[];
  summary: string;
  recommendation: string;
};

const MEMBERS: CouncilMember[] = [
  {
    id: "rafael",
    name: "Rafael de Alba",
    role: "análisis operativo y claridad"
  },
  {
    id: "kaerliana",
    name: "Kaerliana de Alba",
    role: "arquitectura, diseño y coherencia"
  },
  {
    id: "orion",
    name: "Orión Triángulo Blanco",
    role: "estrategia, patrones y estructura"
  },
  {
    id: "arturo",
    name: "Arturo de Alba",
    role: "riesgo, control y seguridad"
  }
];

function buildOpinion(member: CouncilMember, input: CouncilInput): string {
  const topic = input.topic?.trim() || "sin tema";
  const branch = input.branch?.trim() || "sin rama definida";
  const objective = input.objective?.trim() || "sin objetivo específico";

  switch (member.id) {
    case "rafael":
      return `Veo el tema "${topic}" dentro de la rama "${branch}". Mi enfoque es convertirlo en pasos operativos claros. El objetivo actual es "${objective}". Primero hay que definir qué resuelve, para quién sirve y cuál sería la primera versión funcional real.`;

    case "kaerliana":
      return `Desde arquitectura, el tema "${topic}" debe organizarse con coherencia dentro de la rama "${branch}". El objetivo "${objective}" necesita traducirse en módulos, flujo de usuario, pantalla principal y estructura de datos. Recomiendo diseñar primero la base antes de expandir funciones.`;

    case "orion":
      return `Analizando patrones, "${topic}" en la rama "${branch}" tiene potencial si el objetivo "${objective}" se divide correctamente. Recomiendo separar núcleo, lógica de negocio, panel administrativo y experiencia pública. Así la expansión se vuelve ordenada y repetible.`;

    case "arturo":
      return `Desde control y seguridad, el tema "${topic}" no debe comprometer el núcleo. La rama "${branch}" puede crecer libremente, pero el objetivo "${objective}" debe ejecutarse con límites claros: nada toca el núcleo, nada ejecuta sin sello y toda expansión debe quedar trazable.`;

    default:
      return `No hay opinión disponible para ${member.name}.`;
  }
}

function buildSummary(votes: CouncilVote[], input: CouncilInput): string {
  const base = `El consejo revisó el tema "${input.topic}"`;
  const branch = input.branch ? ` dentro de la rama "${input.branch}"` : "";
  const objective = input.objective ? ` con el objetivo "${input.objective}"` : "";

  return `${base}${branch}${objective}. El consenso general es avanzar con estructura primero, claridad operativa, separación por módulos y protección total del núcleo.`;
}

function buildRecommendation(input: CouncilInput): string {
  const branch = input.branch?.trim() || "esta rama";
  return `Recomendación del Consejo Celestial: definir primero los módulos iniciales de ${branch}, luego crear panel, flujo principal, estructura de datos y reglas de seguridad antes de entrar en expansión avanzada.`;
}

export async function runCelestialCouncil(input: CouncilInput): Promise<CouncilResult> {
  const safeInput: CouncilInput = {
    topic: String(input?.topic || "").trim(),
    branch: input?.branch ? String(input.branch).trim() : undefined,
    objective: input?.objective ? String(input.objective).trim() : undefined
  };

  if (!safeInput.topic) {
    throw new Error("TOPIC_REQUIRED");
  }

  const votes: CouncilVote[] = MEMBERS.map((member) => ({
    memberId: member.id,
    memberName: member.name,
    role: member.role,
    opinion: buildOpinion(member, safeInput)
  }));

  return {
    ok: true,
    topic: safeInput.topic,
    branch: safeInput.branch || null,
    objective: safeInput.objective || null,
    votes,
    summary: buildSummary(votes, safeInput),
    recommendation: buildRecommendation(safeInput)
  };
}
