export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createProposal } from "../../../../../src/ai/autoprog/patchStore";
import { generateMultiFileCode } from "../../../../../src/ai/autoprog/multiFileCodeGenerator";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const intent = clean(body?.intent || body?.input || body?.instruction);
    const branch = clean(body?.branch) || undefined;
    const essence = clean(body?.essence) || "arturo";

    if (!intent) {
      return NextResponse.json(
        { ok: false, error: "EMPTY_INTENT" },
        { status: 400 }
      );
    }

    const preview = generateMultiFileCode({ intent, branch, essence });

    const files = preview.files.map((file) => ({
      path: file.path,
      content: file.content,
      mode: "full-file",
    }));

    const proposal = await createProposal({
      title: `Multiarchivo generado por intención: ${intent.slice(0, 80)}`,
      summary: `Proposal multiarchivo generada para la rama ${preview.branch}. No se aplicó ningún cambio. Requiere Sello de Kairos.`,
      type: "proposal",
      risk: "medium",
      reason: "Generated from Multi File Code Generator.",
      proposedBy: essence,
      source: "kairos-autoprog-multi-create-proposal",
      files,
      targetFiles: files.map((f) => f.path),
      tags: ["autoprog", "multi-file", essence, preview.branch],
      metadata: {
        intent,
        branch: preview.branch,
        essence,
        previewMode: preview.mode,
        requiresApproval: true,
        canExecute: false,
        sealRequired: true,
        mode: "MULTI_FILE_CREATE_PROPOSAL",
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "MULTI_FILE_CREATE_PROPOSAL",
      proposal,
      fileCount: files.length,
      targetFiles: files.map((f) => f.path),
      message: "Proposal multiarchivo creada. Pendiente de aprobación y Sello de Kairos.",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "MULTI_CREATE_PROPOSAL_FAIL" },
      { status: 500 }
    );
  }
}
