import fs from "fs";
import path from "path";
import { createProposal } from "./proposal-engine";

type ModuleTemplateInput = {
  moduleName: string;
  title?: string;
  description?: string;
};

function safeName(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function fileExists(filePath: string) {
  return fs.existsSync(filePath);
}

function buildPageTsx(moduleName: string, title: string, description: string) {
  return `export default function ${pascalCase(moduleName)}Page() {
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
      <h1>${title}</h1>
      <p>${description}</p>

      <div style={{ marginTop: "30px", border: "1px solid #00ff88", padding: "16px" }}>
        <p>Módulo generado automáticamente por ORA.</p>
        <p>Nombre interno: ${moduleName}</p>
      </div>
    </div>
  );
}
`;
}

function buildRouteTs(moduleName: string, title: string, description: string) {
  return `export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    module: "${moduleName}",
    title: "${title}",
    description: "${description}",
    generatedBy: "ORA module-generator-engine",
  });
}
`;
}

function buildLogicTs(moduleName: string) {
  return `export function get${pascalCase(moduleName)}Info() {
  return {
    ok: true,
    module: "${moduleName}",
    message: "Lógica base generada por ORA",
  };
}
`;
}

function pascalCase(input: string) {
  return safeName(input)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export async function generateModuleTemplate(input: ModuleTemplateInput) {
  const moduleName = safeName(input.moduleName);
  const title = input.title?.trim() || `ORA — ${pascalCase(moduleName)}`;
  const description =
    input.description?.trim() ||
    `Módulo ${moduleName} generado automáticamente por ORA.`;

  if (!moduleName) {
    return {
      ok: false,
      error: "moduleName es obligatorio",
    };
  }

  const appDir = path.join(process.cwd(), "app", moduleName);
  const apiDir = path.join(process.cwd(), "app", "api", moduleName);
  const logicDir = path.join(process.cwd(), "src", "ai", "modules", moduleName);

  ensureDir(appDir);
  ensureDir(apiDir);
  ensureDir(logicDir);

  const pageFile = path.join(appDir, "page.tsx");
  const routeFile = path.join(apiDir, "route.ts");
  const logicFile = path.join(logicDir, "index.ts");

  const createdFiles: string[] = [];
  const skippedFiles: string[] = [];

  if (!fileExists(pageFile)) {
    fs.writeFileSync(pageFile, buildPageTsx(moduleName, title, description), "utf8");
    createdFiles.push(`app/${moduleName}/page.tsx`);
  } else {
    skippedFiles.push(`app/${moduleName}/page.tsx`);
  }

  if (!fileExists(routeFile)) {
    fs.writeFileSync(routeFile, buildRouteTs(moduleName, title, description), "utf8");
    createdFiles.push(`app/api/${moduleName}/route.ts`);
  } else {
    skippedFiles.push(`app/api/${moduleName}/route.ts`);
  }

  if (!fileExists(logicFile)) {
    fs.writeFileSync(logicFile, buildLogicTs(moduleName), "utf8");
    createdFiles.push(`src/ai/modules/${moduleName}/index.ts`);
  } else {
    skippedFiles.push(`src/ai/modules/${moduleName}/index.ts`);
  }

  const proposal = await createProposal({
    title: `ORA generó estructura base para módulo ${moduleName}`,
    summary: `Se creó la plantilla inicial del módulo ${moduleName} con página, ruta API y lógica base.`,
    type: "feature",
    risk: "low",
    reason: "Generación automática de módulo base a partir de intención estructural.",
    proposedBy: "arturo",
    source: "scan",
    tags: ["module", "generator", "autoprog", moduleName],
    files: createdFiles.map((file) => ({
      path: file,
      mode: "full-file",
      content: fs.readFileSync(file, "utf8"),
    })),
  });

  return {
    ok: true,
    moduleName,
    title,
    description,
    createdFiles,
    skippedFiles,
    proposal,
    message: `ORA generó la plantilla base del módulo ${moduleName}.`,
  };
}
