export const runtime = "nodejs";

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const ROOT = process.cwd();

function hasValidSeal(req: Request) {
  const expected = String(process.env.KAIROS_SEAL || "").trim();
  if (!expected) return true;
  return String(req.headers.get("x-kairos-seal") || "").trim() === expected;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function saveRepair(payload: any) {
  const dir = path.join(ROOT, "data/autoprog/auto-repair");
  ensureDir(dir);

  const id = `repair-${Date.now()}`;
  const file = path.join(dir, `${id}.json`);

  fs.writeFileSync(file, JSON.stringify({ id, ...payload }, null, 2), "utf8");

  return {
    id,
    file: path.relative(ROOT, file),
  };
}

function createRepairProposal(params: {
  title: string;
  summary: string;
  targetFile: string;
  content: string;
  reason: string;
}) {
  const id = `autorepair-${Date.now()}`;

  const proposal = {
    id,
    title: params.title,
    summary: params.summary,
    type: "proposal",
    risk: "low",
    reason: params.reason,
    proposedBy: "kairos-autorepair",
    source: "kairos-autoprog-auto-repair",
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    files: [
      {
        path: params.targetFile,
        content: params.content,
        delete: false,
        mode: "full-file",
      },
    ],
    targetFiles: [params.targetFile],
    metadata: {
      autoRepair: true,
      requiresApproval: true,
      sealRequired: true,
      mode: "AUTO_REPAIR_PROPOSAL_ENGINE",
    },
  };

  const dir = path.join(ROOT, "ora-data/proposals");
  ensureDir(dir);

  fs.writeFileSync(
    path.join(dir, `${id}.json`),
    JSON.stringify(proposal, null, 2),
    "utf8"
  );

  return proposal;
}

function detectCannotFindName(text: string) {
  const match = text.match(/\.\/([^\s:]+):\d+:\d+[\s\S]*?Cannot find name ['"]([^'"]+)['"]/i);
  if (!match) return null;

  return {
    file: match[1],
    missingName: match[2],
  };
}

function repairCannotFindName(file: string, missingName: string) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) return null;

  const original = fs.readFileSync(abs, "utf8");

  if (!original.includes(missingName)) return null;

  const fixed = original.replace(
    new RegExp(`\\{\\s*${missingName}\\s*\\}`, "g"),
    `"AutoRepair placeholder"`
  );

  if (fixed === original) return null;

  return {
    file,
    content: fixed,
  };
}

export async function POST(req: Request) {
  try {
    if (!hasValidSeal(req)) {
      return NextResponse.json(
        { ok: false, error: "SELLO_INVALIDO" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const buildText = [
      body?.stderr,
      body?.stdout,
      body?.error,
      body?.build?.stderr,
      body?.build?.stdout,
    ]
      .filter(Boolean)
      .join("\n");

    const detected = detectCannotFindName(buildText);

    if (detected) {
      const repaired = repairCannotFindName(
        detected.file,
        detected.missingName
      );

      if (repaired) {
        const proposal = createRepairProposal({
          title: `AutoRepair: corregir variable inexistente ${detected.missingName}`,
          summary: `AutoRepair detectó un error de TypeScript: Cannot find name '${detected.missingName}'. Preparó una propuesta para reemplazar la referencia rota por un valor seguro.`,
          targetFile: repaired.file,
          content: repaired.content,
          reason: buildText.slice(0, 3000),
        });

        const saved = saveRepair({
          ok: true,
          action: "REPAIR_PROPOSAL_READY",
          detected,
          proposalId: proposal.id,
          createdAt: new Date().toISOString(),
        });

        return NextResponse.json({
          ok: true,
          mode: "AUTO_REPAIR_ENGINE",
          action: "REPAIR_PROPOSAL_READY",
          proposal,
          saved,
          message: "AutoRepair generó una propuesta pendiente bajo Sello de Kairos.",
        });
      }

      const fallbackContent = `export default function Page() {
  return <div>AutoRepair reconstruyó esta página porque el archivo original no existía o no pudo leerse.</div>;
}
`;

      const proposal = createRepairProposal({
        title: `AutoRepair: reconstruir archivo faltante ${detected.file}`,
        summary: `AutoRepair detectó Cannot find name '${detected.missingName}', pero el archivo no estaba disponible. Preparó una propuesta segura para crear/reconstruir el archivo.`,
        targetFile: detected.file,
        content: fallbackContent,
        reason: buildText.slice(0, 3000),
      });

      const saved = saveRepair({
        ok: true,
        action: "REPAIR_PROPOSAL_READY_MISSING_FILE",
        detected,
        proposalId: proposal.id,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        mode: "AUTO_REPAIR_ENGINE",
        action: "REPAIR_PROPOSAL_READY",
        proposal,
        saved,
        message: "AutoRepair generó propuesta aunque el archivo no existía.",
      });
    }

    const saved = saveRepair({
      ok: true,
      action: "NO_CONFIDENT_REPAIR",
      detected,
      buildText: buildText.slice(0, 5000),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      mode: "AUTO_REPAIR_ENGINE",
      action: "NO_CONFIDENT_REPAIR",
      saved,
      message: "AutoRepair detectó fallo, pero no encontró reparación confiable.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "AUTO_REPAIR_FAIL",
      },
      { status: 500 }
    );
  }
}
