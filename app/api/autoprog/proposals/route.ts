export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { listProposals } from "../../../../src/ai/autoprog/patchStore";

function normalizeTimestamp(value: any) {
  if (!value) return null;

  if (typeof value === "number") {
    try {
      return new Date(value).toISOString();
    } catch {
      return null;
    }
  }

  const raw = String(value).trim();
  if (!raw) return null;

  try {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toISOString();
  } catch {
    return raw;
  }
}

export async function GET() {
  try {
    const proposals = await listProposals();

    const normalized = proposals.map((proposal: any) => ({
      id: proposal.id,
      title: proposal.title || "Untitled proposal",
      summary: proposal.summary || "",
      type: proposal.type || "patch",
      risk: proposal.risk || "unknown",
      reason: proposal.reason || "",
      proposedBy: proposal.proposedBy || "unknown",
      source: proposal.source || "patchStore",
      status: proposal.status || "pending",
      createdAt: normalizeTimestamp(proposal.createdAt),
      updatedAt: normalizeTimestamp(proposal.updatedAt),
      appliedAt: normalizeTimestamp(proposal.appliedAt),
      deniedAt: normalizeTimestamp(proposal.deniedAt),
      archivedAt: normalizeTimestamp(proposal.archivedAt),
      archived: proposal.archived === true,
      tags: Array.isArray(proposal.tags) ? proposal.tags : [],
      targetFiles: Array.isArray(proposal.targetFiles)
        ? proposal.targetFiles
        : Array.isArray(proposal.files)
        ? proposal.files.map((f: any) => f?.path).filter(Boolean)
        : [],
      files: Array.isArray(proposal.files) ? proposal.files : [],
      metadata:
        proposal.metadata && typeof proposal.metadata === "object"
          ? proposal.metadata
          : null,
    }));

    return NextResponse.json({
      ok: true,
      proposals: normalized,
      summary: {
        total: normalized.length,
        pending: normalized.filter((p: any) => p.status === "pending").length,
        applied: normalized.filter((p: any) => p.status === "applied").length,
        denied: normalized.filter((p: any) => p.status === "denied").length,
        archived: normalized.filter((p: any) => p.status === "archived").length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "PROPOSALS_READ_FAIL",
        proposals: [],
        summary: {
          total: 0,
          pending: 0,
          applied: 0,
          denied: 0,
          archived: 0,
        },
      },
      { status: 500 }
    );
  }
}
