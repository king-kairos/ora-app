export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generateProposalPlan } from "../../../../../src/ai/orchestrator/proposalGenerationEngine";
import { createProposal } from "../../../../../src/ai/autoprog/patchStore";
import { generateAutoprogFiles, isAutoprogAlreadyMaterialized } from "../../../../../src/ai/autoprog/contentGenerator";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const intent = clean(body?.intent || body?.input || body?.instruction);
    const branch = clean(body?.branch) || undefined;

    const targetFiles = Array.isArray(body?.targetFiles)
      ? body.targetFiles.map(clean).filter(Boolean)
      : undefined;

    if (!intent) {
      return NextResponse.json(
        { ok: false, error: "EMPTY_INTENT" },
        { status: 400 }
      );
    }

    const plan = generateProposalPlan({
      intent,
      branch,
      targetFiles,
    });

    const alreadyMaterialized = isAutoprogAlreadyMaterialized({
      intent,
      targetFiles: plan.targetFiles,
      proposedBy: plan.proposedBy,
      risk: plan.risk,
      branch,
    });

    if (alreadyMaterialized) {
      return NextResponse.json({
        ok: true,
        mode: "AUTO_PROGRAMMING_ALREADY_MATERIALIZED_NOOP",
        proposalCreated: false,
        alreadyMaterialized: true,
        requiresApproval: false,
        canExecute: false,
        message:
          "La intención ya está materializada. No se creó ninguna proposal.",
        createdAt: new Date().toISOString(),
      });
    }

    const files =
      plan.targetFiles.length > 0
        ? generateAutoprogFiles({
            intent,
            targetFiles: plan.targetFiles,
            proposedBy: plan.proposedBy,
            risk: plan.risk,
            branch,
          })
        : [
            {
              path: "ora-data/autoprog/generated-proposal-note.txt",
              content:
                `AUTO PROGRAMMING PROPOSAL\n\n` +
                `Intent: ${intent}\n` +
                `Essence: ${plan.proposedBy}\n` +
                `Risk: ${plan.risk}\n` +
                `CreatedAt: ${new Date().toISOString()}\n`,
            },
          ];

    const proposal = await createProposal({
      title: plan.title,
      summary: plan.summary,
      type: "proposal",
      risk: plan.risk,
      reason: "Generated from Auto Programming Code Preview.",
      proposedBy: plan.proposedBy,
      source: "kairos-autoprog-create-proposal",
      files,
      targetFiles: plan.targetFiles,
      tags: ["autoprog", "code-preview", plan.proposedBy],
      metadata: {
        intent,
        branch: branch || null,
        plan,
        requiresApproval: true,
        canExecute: false,
        sealRequired: true,
        mode: "AUTO_PROGRAMMING_CREATE_PROPOSAL",
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "AUTO_PROGRAMMING_CREATE_PROPOSAL",
      proposal,
      message:
        "Propuesta creada en Proposal Store con contenido aplicable multiarchivo. No se aplicó ningún cambio. Requiere aprobación del Sello de Kairos.",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "CREATE_AUTOPROG_PROPOSAL_FAIL",
      },
      { status: 500 }
    );
  }
}
