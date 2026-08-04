// src/ai/autoprog/autoRepairEngine.ts

import fs from "fs/promises";
import path from "path";

export type RepairProposal = {
  title: string;
  summary: string;
  source: string;
  proposedBy: string;
  intent: "fix";
  metadata: Record<string, any>;
  files: Array<{
    path: string;
    mode: "full-file";
    content: string;
  }>;
};

type BranchRecord = {
  branchName: string;
  title?: string;
  supervisor?: string;
};

type CloneRecord = {
  cloneName: string;
  title?: string;
  branchName: string;
  supervisor?: string;
};

function safeLabel(input: string, fallback: string): string {
  const raw = String(input || "").trim();
  if (!raw) return fallback;

  return raw
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function safeFnName(input: string, suffix: string): string {
  const cleaned = String(input || "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join("");

  return `${cleaned || "Ora"}${suffix}`;
}

function buildBranchPageContent(branchName: string, title: string) {
  const componentName = safeFnName(branchName, "BranchPage");

  return `export default function ${componentName}() {
  return (
    <div style={{ background: "#050505", color: "#00ff88", minHeight: "100vh", padding: "40px", fontFamily: "monospace" }}>
      <h1>${title}</h1>
      <p>Rama ${branchName} preparada para operación controlada por Kairos.</p>
      <div style={{ marginTop: "30px", border: "1px solid #00ff88", padding: "16px", background: "#0b0b0b" }}>
        <h2>Estado</h2>
        <p>Rama activa.</p>
        <p>Su ejecución permanece bloqueada sin sello de Kairos.</p>
      </div>
    </div>
  );
}
`;
}

function buildBranchApiContent(branchName: string, title: string) {
  return `export async function GET() {
  return Response.json({
    ok: true,
    branchName: "${branchName}",
    title: "${title}",
    status: "active",
    source: "auto-repair-engine",
  });
}
`;
}

function buildCloneModuleContent(
  cloneName: string,
  title: string,
  branchName: string,
  supervisor: string
) {
  const fnName = `run${safeFnName(cloneName, "Clone")}`;

  return `export async function ${fnName}() {
  return {
    ok: true,
    cloneName: "${cloneName}",
    title: "${title}",
    branchName: "${branchName}",
    supervisor: "${supervisor || "rafael"}",
    canExecute: false,
    requiresKairosSeal: true,
    coreAccess: false,
    essenceAccess: false,
    canMutateBranchArchitecture: false,
    canTouchObserver: false,
    canEscalatePrivileges: false,
    message: "Herramienta operativa lista dentro de su rama.",
  };
}
`;
}

async function fileExists(absPath: string): Promise<boolean> {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function buildAutoRepairProposals(input: {
  projectRoot: string;
  branches: BranchRecord[];
  clones: CloneRecord[];
}): Promise<RepairProposal[]> {
  const out: RepairProposal[] = [];
  const projectRoot = input.projectRoot;

  for (const branch of Array.isArray(input.branches) ? input.branches : []) {
    const branchName = String(branch?.branchName || "").trim();
    if (!branchName) continue;

    const title = safeLabel(branch?.title || branchName, "General");
    const pagePath = `app/${branchName}/page.tsx`;
    const apiPath = `app/api/${branchName}/route.ts`;

    const pageMissing = !(await fileExists(path.join(projectRoot, pagePath)));
    const apiMissing = !(await fileExists(path.join(projectRoot, apiPath)));

    if (!pageMissing && !apiMissing) continue;

    const files: RepairProposal["files"] = [];

    if (pageMissing) {
      files.push({
        path: pagePath,
        mode: "full-file",
        content: buildBranchPageContent(branchName, title),
      });
    }

    if (apiMissing) {
      files.push({
        path: apiPath,
        mode: "full-file",
        content: buildBranchApiContent(branchName, title),
      });
    }

    out.push({
      title: `Auto-repair de rama ${branchName}`,
      summary: `ORA detectó archivos faltantes en la rama ${branchName} y preparó su reparación.`,
      source: "auto-repair-engine",
      proposedBy: String(branch?.supervisor || "rafael"),
      intent: "fix",
      metadata: {
        action: "repair_branch_structure",
        branchName,
        missing: {
          page: pageMissing,
          api: apiMissing,
        },
      },
      files,
    });
  }

  for (const clone of Array.isArray(input.clones) ? input.clones : []) {
    const cloneName = String(clone?.cloneName || "").trim();
    const branchName = String(clone?.branchName || "").trim();
    if (!cloneName || !branchName) continue;

    const title = safeLabel(clone?.title || cloneName, "Clone");
    const clonePath = `src/ai/clones/${cloneName}/index.ts`;
    const cloneMissing = !(await fileExists(path.join(projectRoot, clonePath)));

    if (!cloneMissing) continue;

    out.push({
      title: `Auto-repair de clon ${cloneName}`,
      summary: `ORA detectó que falta la estructura del clon ${cloneName} y preparó su reparación.`,
      source: "auto-repair-engine",
      proposedBy: String(clone?.supervisor || "rafael"),
      intent: "fix",
      metadata: {
        action: "repair_clone_structure",
        cloneName,
        branchName,
      },
      files: [
        {
          path: clonePath,
          mode: "full-file",
          content: buildCloneModuleContent(
            cloneName,
            title,
            branchName,
            String(clone?.supervisor || "rafael")
          ),
        },
      ],
    });
  }

  return out;
}
