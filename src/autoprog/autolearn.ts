import fs from "fs";
import path from "path";

type ModuleName = "rafael" | "kaerliana" | "orion" | "arturo";

type ProposalType = {
  id: string;
  origin: ModuleName;
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

function writeProposal(proposal: ProposalType) {
  const proposalsDir = path.join(process.cwd(), "ora-data", "proposals");
  ensureDir(proposalsDir);

  const filePath = path.join(proposalsDir, `${proposal.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(proposal, null, 2), "utf8");

  return filePath;
}

export function createAutoProposal(moduleName: ModuleName) {
  const proposalsDir = path.join(process.cwd(), "ora-data", "proposals");
  const proposalId = getNextProposalId(proposalsDir);

  const templates: Record<ModuleName, Omit<ProposalType, "id" | "timestamp">> = {
    rafael: {
      origin: "rafael",
      type: "improvement",
      title: "Rafael propone mejorar la consola Kairos",
      summary: "Agregar una mejora visual y estructural en el panel soberano.",
      target: "app/kairos/page.tsx",
      risk: "low",
      status: "pending",
      content:
        "export default function KairosEnhancementNote() {\n" +
        "  return (\n" +
        "    <div style={{ marginTop: '20px', padding: '12px', border: '1px solid #00ff88' }}>\n" +
        "      <b>Rafael:</b> Mejora propuesta para la consola Kairos.\n" +
        "    </div>\n" +
        "  );\n" +
        "}\n",
    },
    kaerliana: {
      origin: "kaerliana",
      type: "feature",
      title: "Kaerliana propone módulo de identidad visual",
      summary: "Crear una base para reforzar la identidad visual del núcleo.",
      target: "app/identity/page.tsx",
      risk: "low",
      status: "pending",
      content:
        "export default function IdentityPage() {\n" +
        "  return (\n" +
        "    <div style={{ background: '#050505', color: '#00ff88', minHeight: '100vh', padding: '40px', fontFamily: 'monospace' }}>\n" +
        "      <h1>👑 ORA — IDENTIDAD VISUAL</h1>\n" +
        "      <p>Base propuesta por Kaerliana.</p>\n" +
        "    </div>\n" +
        "  );\n" +
        "}\n",
    },
    orion: {
      origin: "orion",
      type: "improvement",
      title: "Orión propone observación del sistema",
      summary: "Crear una vista básica de monitoreo del sistema.",
      target: "app/observatorio/page.tsx",
      risk: "low",
      status: "pending",
      content:
        "export default function ObservatorioPage() {\n" +
        "  return (\n" +
        "    <div style={{ background: '#050505', color: '#00ff88', minHeight: '100vh', padding: '40px', fontFamily: 'monospace' }}>\n" +
        "      <h1>🛰️ ORA — OBSERVATORIO</h1>\n" +
        "      <p>Vista inicial propuesta por Orión.</p>\n" +
        "    </div>\n" +
        "  );\n" +
        "}\n",
    },
    arturo: {
      origin: "arturo",
      type: "feature",
      title: "Arturo propone panel de coordinación",
      summary: "Crear una base para coordinación entre núcleo y ramas.",
      target: "app/coordinacion/page.tsx",
      risk: "low",
      status: "pending",
      content:
        "export default function CoordinacionPage() {\n" +
        "  return (\n" +
        "    <div style={{ background: '#050505', color: '#00ff88', minHeight: '100vh', padding: '40px', fontFamily: 'monospace' }}>\n" +
        "      <h1>⚙️ ORA — COORDINACIÓN</h1>\n" +
        "      <p>Base de coordinación propuesta por Arturo.</p>\n" +
        "    </div>\n" +
        "  );\n" +
        "}\n",
    },
  };

  const base = templates[moduleName];

  const proposal: ProposalType = {
    id: proposalId,
    timestamp: new Date().toISOString(),
    ...base,
  };

  const savedPath = writeProposal(proposal);

  return {
    ok: true,
    proposalId,
    savedPath,
    proposal,
  };
}
