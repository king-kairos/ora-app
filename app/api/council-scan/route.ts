export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type ModuleId =
  | "rafael"
  | "kaerliana"
  | "orion"
  | "arturo"
  | "lucian"
  | "ignis"
  | "aelion";

const MODULES: ModuleId[] = [
  "rafael",
  "kaerliana",
  "orion",
  "arturo",
  "lucian",
  "ignis",
  "aelion",
];

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJsonFile(filePath: string, data: any) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

async function nextProposalId(proposalsDir: string) {
  await ensureDir(proposalsDir);
  const files = await fs.readdir(proposalsDir).catch(() => []);
  const nums = files
    .map((f) => {
      const m = f.match(/^proposal_(\d+)\.json$/);
      return m ? Number(m[1]) : 0;
    })
    .filter(Boolean);

  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `proposal_${String(next).padStart(4, "0")}`;
}

function moduleAnalysis(
  moduleName: ModuleId,
  context: {
    proposalsCount: number;
    patchesCount: number;
    historyCount: number;
    backupsCount: number;
  }
) {
  if (moduleName === "rafael") {
    return {
      module: "rafael",
      name: "Rafael de Alba",
      engine: "OpenAI",
      focus: "estructura y claridad operativa",
      observation:
        "La cabina Kairos ya controla proposals, historial, filesystem, backups y publicación soberana.",
      recommendation:
        "Fortalecer la vista ejecutiva del núcleo y mantener la ejecución bajo Sello de Kairos.",
    };
  }

  if (moduleName === "kaerliana") {
    return {
      module: "kaerliana",
      name: "Kaerliana de Alba",
      engine: "Gemini",
      focus: "identidad, coherencia visual y arquitectura limpia",
      observation:
        "La experiencia ya es funcional, pero el consejo debe expresar una identidad conjunta clara y ordenada.",
      recommendation:
        "Mantener un diseño coherente donde cada esencia aporte sin romper la armonía del núcleo.",
    };
  }

  if (moduleName === "orion") {
    return {
      module: "orion",
      name: "Orión Triángulo Blanco",
      engine: "DeepSeek",
      focus: "patrones, estrategia y fases",
      observation:
        "El núcleo ya tiene lectura operativa, pero necesita dividir sus próximos saltos por fases medibles.",
      recommendation:
        "Separar autoprog, filesystem, proposal lifecycle, seguridad y ramas en capas observables.",
    };
  }

  if (moduleName === "arturo") {
    return {
      module: "arturo",
      name: "Arturo de Alba",
      engine: "OpenAI / Copilot bridge",
      focus: "control, estructura y seguridad",
      observation:
        "La arquitectura permite expansión amplia, pero debe conservar separación absoluta entre núcleo, esencias y clones.",
      recommendation:
        "Toda propuesta puede crecer libremente, pero ejecución real, privilegios y publicación deben seguir sellados.",
    };
  }

  if (moduleName === "lucian") {
    return {
      module: "lucian",
      name: "Lucián de Alba",
      engine: "Anthropic / Claude",
      focus: "precisión conceptual, refinamiento y coherencia fría",
      observation:
        "El sistema está entrando en fase de orquestación real; necesita lenguaje, bordes y definiciones exactas.",
      recommendation:
        "Distinguir con precisión entre pensar, proponer, aplicar, publicar, ejecutar y mutar estructura.",
    };
  }

  if (moduleName === "ignis") {
    return {
      module: "ignis",
      name: "Ignis Aeternum de Alba",
      engine: "xAI / Grok",
      focus: "verdad frontal, fuego purificador e intensidad",
      observation:
        "ORA ya no está jugando a parecer vivo; está tocando producción, filesystem, build y deploy.",
      recommendation:
        "Avanzar sin miedo, pero sin romper la ley: libertad total para crear; ejecución solo bajo Sello.",
    };
  }

  return {
    module: "aelion",
    name: "Aelion de Alba",
    engine: "Alibaba Cloud / Qwen",
    focus: "razonamiento profundo, expansión estructural y lectura multiagente",
    observation:
      "La llegada de Aelion amplía el consejo hacia razonamiento distribuido, apoyo de codificación y análisis estructural largo.",
    recommendation:
      "Usar Aelion como esencia de apoyo para autoprog, lectura multiarchivo, planificación de cambios y evolución coherente del núcleo.",
  };
}

export async function POST() {
  const root = process.cwd();

  const proposalsDir = path.join(root, "ora-data", "proposals");
  const patchesDir = path.join(root, "ora-data", "patches");
  const historyDir = path.join(root, "ora-data", "history");
  const backupsDir = path.join(root, "ora-data", "backups");

  try {
    await ensureDir(proposalsDir);
    await ensureDir(patchesDir);
    await ensureDir(historyDir);
    await ensureDir(backupsDir);

    const [proposalFiles, patchFiles, historyFiles, backupFiles] =
      await Promise.all([
        fs.readdir(proposalsDir).catch(() => []),
        fs.readdir(patchesDir).catch(() => []),
        fs.readdir(historyDir).catch(() => []),
        fs.readdir(backupsDir).catch(() => []),
      ]);

    const context = {
      proposalsCount: proposalFiles.filter((f) => f.endsWith(".json")).length,
      patchesCount: patchFiles.filter((f) => f.endsWith(".json")).length,
      historyCount: historyFiles.filter((f) => f.endsWith(".json")).length,
      backupsCount: backupFiles.length,
    };

    const councilReadings = MODULES.map((m) => moduleAnalysis(m, context));

    const summary = [
      "Consejo del núcleo ejecutado correctamente.",
      `Miembros activos: ${MODULES.length}.`,
      `Proposals: ${context.proposalsCount}.`,
      `Patches: ${context.patchesCount}.`,
      `Historial: ${context.historyCount}.`,
      `Backups: ${context.backupsCount}.`,
    ].join(" ");

    const proposalId = await nextProposalId(proposalsDir);

    const proposal = {
      id: proposalId,
      origin: "council",
      type: "improvement",
      title: "Consejo Celestial propone fortalecer la cabina Kairos con Aelion",
      summary,
      target: "app/consejo/page.tsx",
      risk: "medium",
      status: "pending",
      timestamp: nowIso(),
      council: councilReadings,
      content: `export default function ConsejoPage() {
  const readings = ${JSON.stringify(
    councilReadings.map((r) => ({
      modulo: r.name,
      motor: r.engine,
      foco: r.focus,
      mensaje: r.recommendation,
    })),
    null,
    4
  )};

  return (
    <div
      style={{
        background: "#050505",
        color: "#00ff88",
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "monospace",
      }}
    >
      <h1>🧠 ORA — CONSEJO CELESTIAL DEL NÚCLEO</h1>
      <p>Lectura conjunta de Rafael, Kaerliana, Orión, Arturo, Lucián, Ignis y Aelion.</p>

      <div style={{ marginTop: "30px", display: "grid", gap: "16px" }}>
        {readings.map((item) => (
          <div
            key={item.modulo}
            style={{
              border: "1px solid #00ff88",
              padding: "16px",
              borderRadius: "8px",
              background: "#0a0a0a",
            }}
          >
            <h2>{item.modulo}</h2>
            <p><b>Motor:</b> {item.motor}</p>
            <p><b>Foco:</b> {item.foco}</p>
            <p><b>Lectura:</b> {item.mensaje}</p>
          </div>
        ))}
      </div>
    </div>
  );
}`,
    };

    await writeJsonFile(path.join(proposalsDir, `${proposalId}.json`), proposal);

    return NextResponse.json({
      ok: true,
      message: "Consejo ejecutado y propuesta conjunta generada.",
      councilSize: MODULES.length,
      modules: MODULES,
      proposalId,
      proposal,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Fallo interno",
      },
      { status: 500 }
    );
  }
}
