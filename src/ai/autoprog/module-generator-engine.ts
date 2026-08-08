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

function pascalCase(input: string) {
  return safeName(input)
    .split("-")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join("");
}

function buildPageTsx(
  moduleName: string,
  title: string,
  description: string
) {
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

      <div
        style={{
          marginTop: "30px",
          border: "1px solid #00ff88",
          padding: "16px",
        }}
      >
        <p>Módulo propuesto automáticamente por ORA.</p>
        <p>Nombre interno: ${moduleName}</p>
      </div>
    </div>
  );
}
`;
}

function buildRouteTs(
  moduleName: string,
  title: string,
  description: string
) {
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

function buildLogicTs(
  moduleName: string
) {
  return `export function get${pascalCase(moduleName)}Info() {
  return {
    ok: true,
    module: "${moduleName}",
    message: "Lógica base generada por ORA",
  };
}
`;
}

/**
 * GENERADOR SOBERANO DE MÓDULOS
 *
 * Esta función NO modifica producción.
 *
 * Permitido:
 * - interpretar;
 * - construir contenido en memoria;
 * - preparar y persistir una proposal.
 *
 * Prohibido aquí:
 * - mkdir sobre targets productivos;
 * - writeFile sobre targets productivos;
 * - registrar el módulo como activo;
 * - build;
 * - restart;
 * - deploy.
 *
 * La mutación real ocurre posteriormente
 * mediante Apply bajo la Puerta Kairos.
 */
export async function generateModuleTemplate(
  input: ModuleTemplateInput
) {
  const moduleName =
    safeName(input.moduleName);

  const title =
    input.title?.trim() ||
    `ORA — ${pascalCase(moduleName)}`;

  const description =
    input.description?.trim() ||
    `Módulo ${moduleName} propuesto automáticamente por ORA.`;

  if (!moduleName) {
    return {
      ok: false,
      error:
        "moduleName es obligatorio",
    };
  }

  const files = [
    {
      path:
        `app/${moduleName}/page.tsx`,
      mode: "full-file" as const,
      content: buildPageTsx(
        moduleName,
        title,
        description
      ),
    },
    {
      path:
        `app/api/${moduleName}/route.ts`,
      mode: "full-file" as const,
      content: buildRouteTs(
        moduleName,
        title,
        description
      ),
    },
    {
      path:
        `src/ai/modules/${moduleName}/index.ts`,
      mode: "full-file" as const,
      content:
        buildLogicTs(moduleName),
    },
  ];

  const proposal =
    await createProposal({
      title:
        `ORA propone estructura base para módulo ${moduleName}`,
      summary:
        `Propuesta para crear la plantilla inicial del módulo ${moduleName} con página, ruta API y lógica base.`,
      type: "feature",
      risk: "low",
      reason:
        "Generación automática de propuesta a partir de intención estructural. Ningún archivo productivo fue modificado durante la generación.",
      proposedBy: "arturo",
      source: "scan",
      tags: [
        "module",
        "generator",
        "autoprog",
        moduleName,
      ],
      files,
    });

  return {
    ok: true,
    mode:
      "MODULE_GENERATOR_PROPOSAL_ONLY",
    moduleName,
    title,
    description,
    createdFiles: [],
    targetFiles:
      files.map((file) => file.path),
    proposal,
    proposalId:
      proposal.id,
    mutationExecuted: false,
    applyRequired: true,
    message:
      `ORA preparó una propuesta para el módulo ${moduleName}. No se modificaron archivos reales.`,
  };
}
