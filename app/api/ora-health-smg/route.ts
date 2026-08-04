import { NextResponse } from "next/server";
import { runAutoHealAnalysis } from "../../../src/ai/autoprog/autoHealEngine";

export async function GET() {
  try {
    const result = await runAutoHealAnalysis();

    return NextResponse.json({
      ok: true,
      status: result.detectedIssue ? "issues_detected" : "healthy",
      detectedIssue: result.detectedIssue,
      issues: result.normalized,
      snapshot: result.snapshot,
      proposal: result.proposal,
      recommendedAction: result.recommendedAction,
      message: result.message,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message: e?.message || "auto-heal error",
      },
      { status: 500 }
    );
  }
}
