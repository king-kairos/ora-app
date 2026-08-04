export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { observeExistingBranches } from "../../../../../src/ai/observer/branchObserver";

function clean(value: unknown) {
  return String(value || "").trim();
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export async function GET() {
  try {
    const observations = await observeExistingBranches();

    return NextResponse.json({
      ok: true,
      mode: "BRANCH_OBSERVER_REGISTRY_PREVIEW",
      observations,
      count: observations.length,
      message:
        "Preview generado. No se guardó nada. No se ejecutó ningún cambio.",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "BRANCH_OBSERVER_PREVIEW_FAIL" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;

    const observations = await observeExistingBranches();
    const origin = new URL(req.url).origin;

    const existingRes = await fetch(`${origin}/api/kairos/autoprog/suggestions`, {
      method: "GET",
      cache: "no-store",
    });

    const existingData = await safeJson(existingRes);
    const existingSuggestions = Array.isArray(existingData?.suggestions)
      ? existingData.suggestions
      : [];

    const activeTitles = new Set(
      existingSuggestions
        .filter((x: any) => clean(x?.status || "pending") !== "archived")
        .map((x: any) => clean(x?.title).toLowerCase())
    );

    const created = [];
    const skipped = [];

    for (const obs of observations) {
      if (activeTitles.has(obs.title.toLowerCase())) {
        skipped.push({ title: obs.title, reason: "ACTIVE_SUGGESTION_EXISTS" });
        continue;
      }

      if (dryRun) {
        skipped.push({ title: obs.title, reason: "DRY_RUN" });
        continue;
      }

      const createRes = await fetch(`${origin}/api/kairos/autoprog/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obs),
      });

      const createData = await safeJson(createRes);

      if (!createRes.ok || createData?.ok === false) {
        skipped.push({
          title: obs.title,
          reason: createData?.error || "CREATE_SUGGESTION_FAILED",
        });
        continue;
      }

      created.push(createData?.suggestion || obs);
    }

    return NextResponse.json({
      ok: true,
      mode: "BRANCH_OBSERVER_REGISTRY",
      observed: observations.length,
      created,
      skipped,
      message:
        "Branch Observer ejecutado. Solo guardó sugerencias pendientes. No aplicó cambios.",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "BRANCH_OBSERVER_REGISTRY_FAIL" },
      { status: 500 }
    );
  }
}
