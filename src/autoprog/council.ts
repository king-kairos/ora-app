import fs from "fs";
import path from "path";

type CouncilProposal = {
  id: string;
  origin: "council";
  contributors: string[];
  type: "feature" | "improvement" | "fix";
  title: string;
  summary: string;
  target: string;
  risk: "low" | "medium" | "high";
  status: "pending";
  timestamp: string;
  content: string;
};

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getNextProposalId(proposalsDir: string): string {
  ensureDir(proposalsDir);

  const files = fs
    .readdirSync(proposalsDir)
    .filter((file) => /^proposal_\d{4}\.json$/.test(file))
    .sort();

  if (files.length === 0) return "proposal_0001";

  const lastFile = files[files.length - 1];
  const lastNumber = Number(lastFile.match(/\d{4}/)?.[0] || "0");
  const nextNumber = String(lastNumber + 1).padStart(4, "0");

  return `proposal_${nextNumber}`;
}

export function createCouncilProposal() {
  const proposalsDir = path.join(process.cwd(), "ora-data", "proposals");
  ensureDir(proposalsDir);

  const proposalId = getNextProposalId(proposalsDir);

  const proposal: CouncilProposal = {
    id: proposalId,
    origin: "council",
    contributors: ["rafael", "kaerliana", "orion", "arturo"],
    type: "improvement",
    title: "Consejo de IA propone mejora conjunta del núcleo",
    summary:
      "Propuesta coordinada entre Rafael, Kaerliana, Orión y Arturo para reforzar el panel soberano de Kairos.",
    target: "app/consejo/page.tsx",
    risk: "medium",
    status: "pending",
    timestamp: new Date().toISOString(),
    content: `export default function ConsejoPage() {
  return (
    <div
      style={{
        background: "#050505",
        color: "#00ff88",
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "monospace"
      }}
    >
      <h1>🧠 ORA — CONSEJO DE IA</h1>
      <p>Espacio de coordinación entre Rafael, Kaerliana, Orión y Arturo.</p>

      <div style={{ marginTop: "30px", border: "1px solid #00ff88", padding: "16px" }}>
        <h2>Miembros del consejo</h2>
        <ul>
          <li>Rafael — análisis de interfaz y núcleo</li>
          <li>Kaerliana — identidad y experiencia</li>
          <li>Orión — observación y arquitectura</li>
          <li>Arturo — coordinación y estructura</li>
        </ul>
      </div>

      <div style={{ marginTop: "30px", border: "1px solid #00ff88", padding: "16px" }}>
        <h2>Estado</h2>
        <p>Consejo inicial activo y listo para emitir propuestas conjuntas.</p>
      </div>
    </div>
  );
}
`,
  };

  const filePath = path.join(proposalsDir, `${proposalId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(proposal, null, 2), "utf8");

  return {
    ok: true,
    proposalId,
    savedPath: filePath,
    proposal,
  };
}
