import fs from "fs";
import path from "path";

function readJsonArray(filePath: string) {
  if (!fs.existsSync(filePath)) return [];

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeJsonArray(filePath: string, value: any[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function writeJsonFile(filePath: string, value: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function inferBranch(cleanName: string) {
  const value = cleanName.toLowerCase();

  if (value.includes("lottery")) return "lottery";
  if (value.includes("pollera")) return "business";
  if (value.includes("granja")) return "business";
  if (value.includes("inventario")) return "business";
  if (value.includes("business")) return "business";
  if (value.includes("camera")) return "public-gateway";
  if (value.includes("camara")) return "public-gateway";
  if (value.includes("gateway")) return "public-gateway";
  if (value.includes("eco")) return "public-gateway";
  if (value.includes("social")) return "community";
  if (value.includes("community")) return "community";

  return "general";
}

function buildPageTsx(title: string, moduleName: string) {
  return `export default function ${toComponentName(moduleName)}Page() {
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
      <h1>${escapeTemplate(title)}</h1>
      <p>Módulo ${escapeTemplate(moduleName)} generado por ORA desde intención estructural.</p>

      <div
        style={{
          marginTop: "30px",
          border: "1px solid #00ff88",
          padding: "16px",
          background: "#0b0b0b",
        }}
      >
        <h2>Estado</h2>
        <p>Base inicial activa.</p>
        <p>Este espacio queda listo para evolución controlada por Kairos.</p>
      </div>
    </div>
  );
}
`;
}

function buildApiRoute(moduleName: string, title: string, branch: string) {
  return `export async function GET() {
  return Response.json({
    ok: true,
    module: "${escapeTemplate(moduleName)}",
    title: "${escapeTemplate(title)}",
    branch: "${escapeTemplate(branch)}",
    status: "active",
    source: "intent-engine",
  });
}
`;
}

function buildModuleIndex(moduleName: string, title: string, branch: string) {
  return `export async function run${toComponentName(moduleName)}Module() {
  return {
    ok: true,
    moduleName: "${escapeTemplate(moduleName)}",
    title: "${escapeTemplate(title)}",
    branch: "${escapeTemplate(branch)}",
    source: "intent-engine",
    message: "Módulo base activo.",
  };
}
`;
}

function toComponentName(input: string) {
  return input
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function escapeTemplate(value: string) {
  return String(value).replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const intent = String(body?.intent || "").trim();

    if (!intent) {
      return Response.json(
        { ok: false, error: "EMPTY_INTENT" },
        { status: 400 }
      );
    }

    const moduleRegistryPath = path.join(
      process.cwd(),
      "ora-data",
      "module-registry.json"
    );
    const proposalRegistryPath = path.join(
      process.cwd(),
      "ora-data",
      "proposal-registry.json"
    );
    const proposalsDir = path.join(process.cwd(), "ora-data", "proposals");

    const modules = readJsonArray(moduleRegistryPath);
    const proposalRegistry = readJsonArray(proposalRegistryPath);

    const cleanName = intent
      .replace(/^crear\\s+modulo\\s+/i, "")
      .replace(/^crear\\s+m[oó]dulo\\s+/i, "")
      .trim();

    const slug = slugify(cleanName || intent);
    const moduleName = slug || `modulo-${Date.now()}`;
    const title = `ORA — ${toComponentName(moduleName).replace(/([A-Z])/g, " $1").trim()}`;
    const branch = inferBranch(cleanName || intent);

    const existingModule = modules.find(
      (item: any) => item?.moduleName === moduleName
    );

    if (existingModule) {
      return Response.json({
        ok: true,
        message: `El módulo ${moduleName} ya existía.`,
        module: existingModule,
      });
    }

    const now = new Date().toISOString();
    const moduleId = `mod_${Date.now()}`;

    const newModule = {
      id: moduleId,
      moduleName,
      title,
      branch,
      source: "intent-engine",
      status: "active",
      createdAt: now,
    };

    modules.unshift(newModule);
    writeJsonArray(moduleRegistryPath, modules);

    const files = [
      {
        path: `app/${moduleName}/page.tsx`,
        mode: "full-file",
        content: buildPageTsx(title, moduleName),
      },
      {
        path: `app/api/${moduleName}/route.ts`,
        mode: "full-file",
        content: buildApiRoute(moduleName, title, branch),
      },
      {
        path: `src/ai/modules/${moduleName}/index.ts`,
        mode: "full-file",
        content: buildModuleIndex(moduleName, title, branch),
      },
    ];

    const proposalId = `proposal_${Date.now()}_${Math.random()
      .toString(16)
      .slice(2, 8)}`;

    const proposal = {
      id: proposalId,
      title: `ORA generó estructura base para módulo ${moduleName}`,
      summary: `Se creó la plantilla inicial del módulo ${moduleName} con página, ruta API y lógica base.`,
      type: "feature",
      risk: "low",
      reason: "Generación automática de módulo base a partir de intención estructural.",
      proposedBy: "arturo",
      createdAt: now,
      status: "pending",
      targetFiles: files.map((f) => f.path),
      files,
      source: "intent-engine",
      tags: ["module", "generator", "autoprog", moduleName],
    };

    fs.mkdirSync(proposalsDir, { recursive: true });
    writeJsonFile(path.join(proposalsDir, `${proposalId}.json`), proposal);

    proposalRegistry.unshift({
      id: proposal.id,
      title: proposal.title,
      summary: proposal.summary,
      type: proposal.type,
      risk: proposal.risk,
      reason: proposal.reason,
      proposedBy: proposal.proposedBy,
      createdAt: proposal.createdAt,
      status: proposal.status,
      targetFiles: proposal.targetFiles,
      files: proposal.files,
      source: proposal.source,
      tags: proposal.tags,
    });
    writeJsonArray(proposalRegistryPath, proposalRegistry);

    return Response.json({
      ok: true,
      message: `Intención ejecutada. Módulo ${moduleName} creado con proposal ejecutable.`,
      module: newModule,
      proposal,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "INTENT_EXEC_FAIL",
      },
      { status: 500 }
    );
  }
}
