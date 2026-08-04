import fs from "fs";
import path from "path";

type Proposal = {
  id?: string;
  title?: string;
  summary?: string;
  type?: string;
  risk?: string;
  status?: string;
  source?: string;
  origin?: string;
  targetFile?: string;
  target?: string;
  proposedBy?: string;
  createdAt?: string;
  [key: string]: any;
};

function readProposalFiles(dirPath: string): Proposal[] {
  if (!fs.existsSync(dirPath)) return [];

  const files = fs
    .readdirSync(dirPath)
    .filter((file) => file.endsWith(".json"))
    .sort();

  const results: Proposal[] = [];

  for (const file of files) {
    try {
      const fullPath = path.join(dirPath, file);
      const raw = fs.readFileSync(fullPath, "utf8");
      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === "object") {
        results.push(parsed);
      }
    } catch {
      // ignorar archivos dañados
    }
  }

  return results;
}

function classifyProposal(proposal: Proposal) {
  const risk = proposal.risk || "unknown";
  const type = proposal.type || "unknown";
  const source = proposal.source || proposal.origin || "unknown";
  const targetFile = proposal.targetFile || proposal.target || "";

  const reasons: string[] = [];

  if (risk === "high") {
    reasons.push("Riesgo alto");
    return { decision: "blocked", reasons };
  }

  if (String(targetFile).includes("security")) {
    reasons.push("Toca zona sensible de seguridad");
    return { decision: "review", reasons };
  }

  if (String(targetFile).includes("kairos")) {
    reasons.push("Toca panel soberano Kairos");
    return { decision: "review", reasons };
  }

  if (source === "council" && risk === "medium") {
    reasons.push("Propuesta del consejo con riesgo medio");
    return { decision: "review", reasons };
  }

  if (risk === "medium") {
    reasons.push("Riesgo medio requiere validación");
    return { decision: "review", reasons };
  }

  if (risk === "low" && type === "improvement") {
    reasons.push("Mejora de bajo riesgo");
    return { decision: "safe", reasons };
  }

  if (risk === "low" && source === "scan") {
    reasons.push("Detección automática de bajo riesgo");
    return { decision: "safe", reasons };
  }

  reasons.push("No cumple criterio automático de seguridad");
  return { decision: "review", reasons };
}

export async function runSupervisor() {
  const proposalsDir = path.join(process.cwd(), "ora-data", "proposals");
  const all = readProposalFiles(proposalsDir);
  const pending = all.filter((p) => p.status === "pending");

  const evaluated = pending.map((proposal) => {
    const result = classifyProposal(proposal);

    return {
      id: proposal.id || "sin-id",
      title: proposal.title || "Sin título",
      risk: proposal.risk || "N/D",
      type: proposal.type || "N/D",
      source: proposal.source || proposal.origin || "N/D",
      targetFile: proposal.targetFile || proposal.target || "N/D",
      proposedBy: proposal.proposedBy || "N/D",
      decision: result.decision,
      reasons: result.reasons,
    };
  });

  const safe = evaluated.filter((p) => p.decision === "safe");
  const review = evaluated.filter((p) => p.decision === "review");
  const blocked = evaluated.filter((p) => p.decision === "blocked");

  return {
    ok: true,
    createdAt: new Date().toISOString(),
    totalPending: pending.length,
    summary: {
      safe: safe.length,
      review: review.length,
      blocked: blocked.length,
    },
    safe,
    review,
    blocked,
    message:
      "Supervisor ejecutado: ORA evaluó propuestas pendientes y clasificó cuáles son seguras, cuáles requieren revisión y cuáles deben bloquearse.",
  };
}
