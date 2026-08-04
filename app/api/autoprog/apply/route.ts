export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { applyPatch } from "../../../../src/ai/autoprog/applyPatch";
import { getProposal, setStatus } from "../../../../src/ai/autoprog/patchStore";
import { authorizeKairosExecution } from "../../../../src/security/kairosExecutionGate";

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

    return NextResponse.json({
      ok: true,
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
