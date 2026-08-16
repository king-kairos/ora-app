export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generateProposalPlan } from "../../../../../src/ai/orchestrator/proposalGenerationEngine";
import { generateAutoprogFiles, isAutoprogAlreadyMaterialized } from "../../../../../src/ai/autoprog/contentGenerator";
import { createProposal } from "../../../../../src/ai/autoprog/patchStore";
import {
  suggestionToIntent,
  suggestionToPreferredEssence,
} from "../../../../../src/ai/autoprog/suggestionToProposal";

export async function POST(req: Request) {
  try {
    const suggestion = await req.json().catch(() => ({}));

    const intent = suggestionToIntent(suggestion);
    const preferredEssence = suggestionToPreferredEssence(suggestion);

    const plan = generateProposalPlan({
      intent,
      preferredEssence,
    });

    const alreadyMaterialized = isAutoprogAlreadyMaterialized({
      intent,
      targetFiles: plan.targetFiles,
      proposedBy: plan.proposedBy,
      risk: plan.risk,
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
          "La sugerencia ya está materializada. No se creó ninguna proposal.",
        createdAt: new Date().toISOString(),
      });
    }

    const files = generateAutoprogFiles({
      intent,
      targetFiles: plan.targetFiles,
      proposedBy: plan.proposedBy,
      risk: plan.risk,
    });

    const proposal = await createProposal({
      title: plan.title,
      summary: plan.summary,
      type: "proposal",
      risk: plan.risk,
      reason: "Generated from Auto Evolution Observer suggestion.",
      proposedBy: plan.proposedBy,
      source: "kairos-autoprog-suggestion",
      files,
      targetFiles: plan.targetFiles,
      tags: ["autoprog", "observer", "suggestion", plan.proposedBy],
      metadata: {
        originalSuggestion: suggestion,
        intent,
        plan,
        requiresApproval: true,
        canExecute: false,
        sealRequired: true,
        mode: "AUTO_PROGRAMMING_SUGGESTION_TO_PROPOSAL",
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "AUTO_PROGRAMMING_SUGGESTION_TO_PROPOSAL",
      proposal,
      message:
        "Sugerencia convertida en proposal real. No se aplicó ningún cambio. Requiere aprobación del Sello de Kairos.",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "CREATE_PROPOSAL_FROM_SUGGESTION_FAIL",
      },
      { status: 500 }
    );
  }
}
