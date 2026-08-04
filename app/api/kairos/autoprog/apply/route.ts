export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { applyPatch } from "../../../../../src/ai/autoprog/applyPatch";
import { getProposal, setStatus } from "../../../../../src/ai/autoprog/patchStore";
import { authorizeKairosExecution } from "../../../../../src/security/kairosExecutionGate";

import {
  advanceStrategicPlanAfterAppliedProposal,
  generateReadyTaskProposals,
} from "@/kairos/strategic-planner/proposal-engine";

export async function POST(req: Request) {
  try {
    const authorization = authorizeKairosExecution(
      req,
      "apply_patch"
    );

    if (!authorization.ok) {
      return NextResponse.json(
        {
          ok: false,
          action: authorization.action,
          error: authorization.error,
        },
        {
          status: authorization.status,
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "MISSING_PROPOSAL_ID" },
        { status: 400 }
      );
    }

    const proposal = await getProposal(id);

    if (!proposal) {
      return NextResponse.json(
        { ok: false, error: "PROPOSAL_NOT_FOUND", id },
        { status: 404 }
      );
    }

    const result = await applyPatch(proposal);

    await setStatus(id, "applied");

    /*
     * STRATEGIC_CYCLE_DIRECT_APPLY_V1
     *
     * También mantiene sincronizado el Strategic Planner
     * cuando se usa la ruta de aplicación directa.
     */
    let strategicCycle: any = {
      linked: false,
      ok: true,
      message:
        "La propuesta no pertenece a un plan estratégico.",
    };

    try {
      const metadata: any =
        (proposal as any)?.metadata || {};

      const planId = String(
        metadata?.planId || ""
      ).trim();

      const taskId =
        String(metadata?.taskId || "").trim() ||
        null;

      const isStrategicProposal =
        metadata?.mode ===
          "STRATEGIC_TASK_TO_PROPOSAL_V1" &&
        Boolean(planId);

      if (isStrategicProposal) {
        const advancedPlan =
          await advanceStrategicPlanAfterAppliedProposal({
            planId,
            proposalId: id,
            taskId,
            operationId: null,
          });

        const nextCycle =
          await generateReadyTaskProposals(
            planId
          );

        strategicCycle = {
          linked: true,
          ok: true,
          planId,
          taskId,
          planStatus:
            advancedPlan.status,
          createdCount:
            nextCycle.createdCount,
          created:
            nextCycle.created,
          skipped:
            nextCycle.skipped,
          message:
            nextCycle.createdCount > 0
              ? "Tarea completada y siguiente propuesta estratégica creada."
              : "Tarea completada. No había otra propuesta ejecutable en este ciclo.",
        };
      }
    } catch (strategicError: any) {
      strategicCycle = {
        linked: true,
        ok: false,
        error:
          strategicError?.message ||
          "STRATEGIC_CYCLE_ADVANCE_FAILED",
        message:
          "La propuesta fue aplicada, pero el avance del plan deberá revisarse.",
      };
    }

    return NextResponse.json({
      ok: true,
      strategicCycle,
      applied: {
        id,
        title: proposal.title || "Untitled proposal",
        written: result.results.filter((r) => r.action === "written").length,
        modified: result.results.filter((r) => r.action === "modified").length,
        deleted: result.results.filter((r) => r.action === "deleted").length,
        results: result.results,
        filePaths: result.results.map((r) => r.path),
      },
      plan: result.plan,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "AUTOPROG_APPLY_FAIL",
      },
      { status: 500 }
    );
  }
}
