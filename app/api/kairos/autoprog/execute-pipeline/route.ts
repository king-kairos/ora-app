export const runtime = "nodejs";

import { NextResponse } from "next/server";

function getSeal(req: Request) {
  return String(req.headers.get("x-kairos-seal") || "").trim();
}

function hasValidSeal(req: Request) {
  const expected = String(process.env.KAIROS_SEAL || "").trim();
  const received = getSeal(req);

  if (!expected) return false;
  if (!received) return false;

  return received === expected;
}

async function jsonFetch(url: string, seal: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-kairos-seal": seal,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data?.ok !== false, status: res.status, data };
}

export async function POST(req: Request) {
  try {
    if (!hasValidSeal(req)) {
      return NextResponse.json({ ok: false, error: "SELLO_INVALIDO" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || body?.proposalId || "").trim();
    const seal = getSeal(req);

    if (!id) {
      return NextResponse.json({ ok: false, error: "MISSING_PROPOSAL_ID" }, { status: 400 });
    }

    const base = new URL(req.url).origin;
    const steps: any[] = [];

    const approve = await jsonFetch(
      `http://127.0.0.1:3001/api/ora/autoprog/approve/${encodeURIComponent(id)}`,
      seal,
      {}
    );
    steps.push({ step: "approve", ...approve });

    if (!approve.ok) {
      return NextResponse.json({
        ok: false,
        mode: "EXECUTE_PIPELINE_STOPPED",
        stoppedAt: "approve",
        proposalId: id,
        steps,
      }, { status: 409 });
    }

    const apply = await jsonFetch(
      `${base}/api/kairos/autoprog/apply`,
      seal,
      { id }
    );
    steps.push({ step: "apply", ...apply });

    if (!apply.ok) {
      return NextResponse.json({
        ok: false,
        mode: "EXECUTE_PIPELINE_STOPPED",
        stoppedAt: "apply",
        proposalId: id,
        steps,
      }, { status: 409 });
    }

    const publish = await jsonFetch(
      `${base}/api/kairos/autoprog/safe-publish`,
      seal,
      { id }
    );
    steps.push({ step: "safe-publish", ...publish });

    if (!publish.ok) {
      return NextResponse.json({
        ok: false,
        mode: "EXECUTE_PIPELINE_STOPPED",
        stoppedAt: "safe-publish",
        proposalId: id,
        steps,
      }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      mode: "KAIROS_EXECUTE_PIPELINE",
      proposalId: id,
      steps,
      message: "Pipeline completo ejecutado bajo Sello de Kairos.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "EXECUTE_PIPELINE_FAIL" },
      { status: 500 }
    );
  }
}
