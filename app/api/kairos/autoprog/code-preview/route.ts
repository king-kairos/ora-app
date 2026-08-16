export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generateProposalPlan } from "../../../../../src/ai/orchestrator/proposalGenerationEngine";
import { generateAutoprogContent } from "../../../../../src/ai/autoprog/contentGenerator";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const intent = clean(body?.intent || body?.input || body?.instruction);
    const branch = clean(body?.branch) || undefined;

    if (!intent) {
      return NextResponse.json({ ok: false, error: "EMPTY_INTENT" }, { status: 400 });
    }

    const plan = generateProposalPlan({ intent, branch });
    const target = plan.targetFiles[0] || "ora-data/autoprog/code-preview.txt";

    const content = generateAutoprogContent({
      intent,
      target,
      proposedBy: plan.proposedBy,
      risk: plan.risk,
      branch,
    });

    let parsedPatch: any = null;
    try {
      parsedPatch = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      parsedPatch = null;
    }

    const files = Array.isArray(parsedPatch?.files) ? parsedPatch.files : [];
    const hasOperations = files.some(
      (f: any) => Array.isArray(f?.operations) && f.operations.length > 0
    );

    const usesLegacyNote = files.some((f: any) => String(f?.mode || "") === "note");
    const alreadyMaterialized = parsedPatch?.alreadyMaterialized === true;

    return NextResponse.json({
      ok: true,
      mode: alreadyMaterialized
        ? "AUTO_PROGRAMMING_ALREADY_MATERIALIZED_NOOP"
        : hasOperations
          ? "AUTO_PROGRAMMING_STRUCTURED_PATCH_PREVIEW"
          : "AUTO_PROGRAMMING_PATCH_FORMAT_REQUIRED",
      plan,
      target,
      proposedBy: plan.proposedBy,
      risk: plan.risk,
      content,
      parsedPatch,
      patchFormatOk: alreadyMaterialized || (hasOperations && !usesLegacyNote),
      hasOperations,
      usesLegacyNote,
      alreadyMaterialized,
      requiresApproval: alreadyMaterialized ? false : true,
      canExecute: false,
      sealRequired: true,
      message: alreadyMaterialized
        ? "La intención ya está materializada. No se genera ninguna mutación."
        : hasOperations
          ? "Preview de patch estructurado generado. No se aplicó ningún cambio."
          : "El preview todavía no contiene files[].operations[]. No se puede aplicar.",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "CODE_PREVIEW_FAIL" },
      { status: 500 }
    );
  }
}
