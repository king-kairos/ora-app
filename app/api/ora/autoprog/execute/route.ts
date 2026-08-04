export const runtime = "nodejs";

import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { runMetaPlanner } from "@/ai/autoprog/meta-planner";
import { validateProposal } from "@/ai/autoprog/proposal-validator";

type ExecuteBody = {
  maxItems?: number;
  includeMedia?: boolean;
  dryRun?: boolean;
};

function normalizeBoolean(value: any, fallback = false) {
  if (typeof value === "boolean") return value;

  const v = String(value || "").trim().toLowerCase();

  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;

  return fallback;
}

function normalizeNumber(value: any, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function pickHeader(source: Headers, keys: string[]) {
  for (const key of keys) {
    const value = source.get(key);
    if (value && String(value).trim()) return value;
  }
  return "";
}

function getBaseUrl(h: Headers) {
  const proto =
    h.get("x-forwarded-proto") ||
    h.get("X-Forwarded-Proto") ||
    "http";

  const host =
    h.get("x-forwarded-host") ||
    h.get("X-Forwarded-Host") ||
    h.get("host") ||
    h.get("Host");

  if (!host) {
    throw new Error("HOST_HEADER_MISSING");
  }

  return `${proto}://${host}`;
}

function loadFullProposal(proposalId: string) {
  const root = process.cwd();
  const proposalPath = path.join(root, "ora-data", "proposals", `${proposalId}.json`);

  if (!fs.existsSync(proposalPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(proposalPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = ((await req.json().catch(() => ({}))) || {}) as ExecuteBody;

    const maxItems = normalizeNumber(body.maxItems, 5);
    const includeMedia = normalizeBoolean(body.includeMedia, true);
    const dryRun = normalizeBoolean(body.dryRun, false);

    const plan = await runMetaPlanner();

    if (!plan?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "META_PLANNER_FAILED",
        },
        { status: 500 }
      );
    }

    const high = Array.isArray(plan?.groups?.alta) ? plan.groups.alta : [];
    const medium = Array.isArray(plan?.groups?.media) ? plan.groups.media : [];
    const low = Array.isArray(plan?.groups?.baja) ? plan.groups.baja : [];

    const candidates = [
      ...high,
      ...(includeMedia ? medium : []),
      ...low,
    ];

    const skipped: any[] = [];
    const selected: any[] = [];

    for (const item of candidates) {
      if (selected.length >= maxItems) break;

      const proposalId = String((item as any)?.id || "").trim();

      if (!proposalId) {
        skipped.push({
          id: "",
          reason: "missing_id",
        });
        continue;
      }

      const fullProposal = loadFullProposal(proposalId);

      if (!fullProposal) {
        skipped.push({
          id: proposalId,
          reason: "proposal_file_not_found",
        });
        continue;
      }

      const validation = validateProposal(fullProposal);

      if (!validation?.ok) {
        skipped.push({
          id: proposalId,
          reason: validation?.reason || "INVALID_PROPOSAL",
        });
        continue;
      }

      selected.push(fullProposal);
    }

    if (selected.length === 0) {
      return NextResponse.json({
        ok: true,
        mode: "idle",
        executed: 0,
        failed: 0,
        selected: [],
        skipped,
        message: "No hay propuestas válidas con target y content para ejecutar.",
      });
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        mode: "dry-run",
        executed: 0,
        failed: 0,
        selected,
        skipped,
        message: "Dry run completado. No se aplicó ningún cambio.",
      });
    }

    const incomingHeaders = await headers();
    const baseUrl = getBaseUrl(incomingHeaders);

    const kairosSeal = pickHeader(incomingHeaders, [
      "x-kairos-seal",
      "X-Kairos-Seal",
    ]);

    const patchSecret = pickHeader(incomingHeaders, [
      "x-kairos-patch-secret",
      "X-Kairos-Patch-Secret",
    ]);

    const results: any[] = [];

    for (const proposal of selected) {
      const proposalId = String(proposal?.id || "").trim();
      if (!proposalId) continue;

      try {
        const res = await fetch(`${baseUrl}/api/apply-proposal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(kairosSeal ? { "x-kairos-seal": kairosSeal } : {}),
            ...(patchSecret ? { "x-kairos-patch-secret": patchSecret } : {}),
          },
          body: JSON.stringify({
            proposalId,
          }),
          cache: "no-store",
        });

        const raw = await res.text();
        let data: any = {};

        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = { raw };
        }

        results.push({
          id: proposalId,
          ok: res.ok && data?.ok !== false,
          status: res.status,
          response: data,
        });
      } catch (error: any) {
        results.push({
          id: proposalId,
          ok: false,
          error: error?.message || "APPLY_FETCH_FAILED",
        });
      }
    }

    const executed = results.filter((x) => x.ok).length;
    const failed = results.filter((x) => !x.ok).length;

    return NextResponse.json({
      ok: true,
      mode: "execute",
      selected,
      skipped,
      executed,
      failed,
      results,
      message: `Ejecución terminada. Aplicadas: ${executed}. Fallidas: ${failed}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "AUTOPROG_EXECUTE_FAILED",
      },
      { status: 500 }
    );
  }
}
