import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type EssenceName = "rafael" | "kaerliana" | "orion" | "arturo";
export type ProposalRisk = "low" | "medium" | "high";
export type ProposalType =
  | "improvement"
  | "bugfix"
  | "refactor"
  | "feature"
  | "security";

export type ProposalFileMode = "full-file" | "diff" | "note";

export type ProposalFile = {
  path: string;
  mode: ProposalFileMode;
  content?: string;
  diff?: string;
  note?: string;
};

export type AutoProposal = {
  id: string;
  title: string;
  summary: string;
  type: ProposalType;
  risk: ProposalRisk;
  reason: string;
  proposedBy: EssenceName;
  createdAt: string;
  status: "pending" | "applied" | "denied";
  targetFiles: string[];
  files: ProposalFile[];
  source: "manual" | "council" | "scan";
  tags?: string[];
};

type CreateProposalInput = {
  title: string;
  summary: string;
  type: ProposalType;
  risk: ProposalRisk;
  reason: string;
  proposedBy: EssenceName;
  files?: ProposalFile[];
  source?: "manual" | "council" | "scan";
  tags?: string[];
};

const PROPOSALS_DIR = path.join(process.cwd(), "ora-data", "proposals");

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function buildProposalId() {
  const stamp = Date.now();
  const rand = crypto.randomBytes(3).toString("hex");
  return `proposal_${stamp}_${rand}`;
}

function normalizeFiles(files?: ProposalFile[]): ProposalFile[] {
  if (!Array.isArray(files)) return [];

  return files
    .filter((f) => f && typeof f.path === "string" && f.path.trim())
    .map((f) => ({
      path: f.path.trim(),
      mode: f.mode || "note",
      content: typeof f.content === "string" ? f.content : undefined,
      diff: typeof f.diff === "string" ? f.diff : undefined,
      note: typeof f.note === "string" ? f.note : undefined,
    }));
}

export async function createProposal(
  input: CreateProposalInput
): Promise<AutoProposal> {
  await ensureDir(PROPOSALS_DIR);

  const files = normalizeFiles(input.files);
  const proposal: AutoProposal = {
    id: buildProposalId(),
    title: input.title.trim(),
    summary: input.summary.trim(),
    type: input.type,
    risk: input.risk,
    reason: input.reason.trim(),
    proposedBy: input.proposedBy,
    createdAt: nowIso(),
    status: "pending",
    targetFiles: files.map((f) => f.path),
    files,
    source: input.source || "manual",
    tags: Array.isArray(input.tags) ? input.tags : [],
  };

  const filePath = path.join(PROPOSALS_DIR, `${proposal.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(proposal, null, 2), "utf8");

  return proposal;
}

export async function getProposal(
  proposalId: string
): Promise<AutoProposal | null> {
  try {
    const filePath = path.join(PROPOSALS_DIR, `${proposalId}.json`);
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function listProposals(): Promise<AutoProposal[]> {
  await ensureDir(PROPOSALS_DIR);

  const files = await fs.readdir(PROPOSALS_DIR).catch(() => []);
  const items: AutoProposal[] = [];

  for (const file of files.filter((f) => f.endsWith(".json")).sort().reverse()) {
    try {
      const raw = await fs.readFile(path.join(PROPOSALS_DIR, file), "utf8");
      items.push(JSON.parse(raw));
    } catch {
      // ignorar archivos dañados
    }
  }

  return items;
}

export async function updateProposalStatus(
  proposalId: string,
  status: "pending" | "applied" | "denied"
): Promise<AutoProposal | null> {
  const proposal = await getProposal(proposalId);
  if (!proposal) return null;

  proposal.status = status;

  const filePath = path.join(PROPOSALS_DIR, `${proposal.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(proposal, null, 2), "utf8");

  return proposal;
}

/**
 * Propuesta base rápida para arrancar el motor AUTOPROG.
 * Luego la podemos reemplazar por consejo real de Rafael/Kaerliana/Orión/Arturo.
 */
export async function createAutoProposal(
  proposedBy: EssenceName
): Promise<AutoProposal> {
  const titles: Record<EssenceName, string> = {
    rafael: "Rafael propone fortalecer estructura del núcleo",
    kaerliana: "Kaerliana propone refinar la expresión de soberanía",
    orion: "Orión propone optimizar la lectura estratégica del sistema",
    arturo: "Arturo propone mejorar la coordinación operativa",
  };

  const summaries: Record<EssenceName, string> = {
    rafael:
      "Se detectó una oportunidad de mejora en la estructura técnica del núcleo ORA.",
    kaerliana:
      "Se detectó una oportunidad para refinar la experiencia de interacción en soberanía.",
    orion:
      "Se detectó una oportunidad para mejorar claridad, trazabilidad o análisis del sistema.",
    arturo:
      "Se detectó una oportunidad para mejorar orden, flujo operativo o ejecución.",
  };

  const reasons: Record<EssenceName, string> = {
    rafael: "Mayor claridad estructural y estabilidad evolutiva.",
    kaerliana: "Mayor coherencia expresiva entre esencia y experiencia.",
    orion: "Mayor lectura estratégica y reducción de puntos ciegos.",
    arturo: "Mayor orden operativo y eficiencia de implementación.",
  };

  return await createProposal({
    title: titles[proposedBy],
    summary: summaries[proposedBy],
    type: "improvement",
    risk: "medium",
    reason: reasons[proposedBy],
    proposedBy,
    source: "scan",
    tags: ["autoprog", proposedBy],
    files: [
      {
        path: "app/soberania/page.tsx",
        mode: "note",
        note: `Propuesta inicial generada por ${proposedBy} para evolución del núcleo.`,
      },
    ],
  });
}
