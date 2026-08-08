export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data/autoprog/deploy-history");
const FILE = path.join(DIR, "history.jsonl");

function seal(req: Request) {
  const expected = String(process.env.KAIROS_SEAL || "").trim();
  if (!expected) return false;
  return String(req.headers.get("x-kairos-seal") || "").trim() === expected;
}

function ensureDir() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
}

export async function GET(req: Request) {
  if (!seal(req)) {
    return NextResponse.json({ ok: false, error: "SELLO_INVALIDO" }, { status: 403 });
  }

  ensureDir();

  const rows = fs.existsSync(FILE)
    ? fs.readFileSync(FILE, "utf8").trim().split("\n").filter(Boolean).map((x) => {
        try { return JSON.parse(x); } catch { return null; }
      }).filter(Boolean).slice(-50).reverse()
    : [];

  return NextResponse.json({
    ok: true,
    mode: "DEPLOY_HISTORY",
    count: rows.length,
    items: rows,
  });
}

export async function POST(req: Request) {
  try {
    if (!seal(req)) {
      return NextResponse.json({ ok: false, error: "SELLO_INVALIDO" }, { status: 403 });
    }

    ensureDir();

    const body = await req.json().catch(() => ({}));

    const record = {
      id: `deploy-${Date.now()}`,
      proposalId: body?.proposalId || null,
      branch: body?.branch || null,
      buildPassed: body?.buildPassed ?? null,
      deploy: body?.deploy ?? null,
      smokeTest: body?.smokeTest ?? null,
      source: body?.source || "safe-publish",
      createdAt: new Date().toISOString(),
    };

    fs.appendFileSync(FILE, JSON.stringify(record) + "\n", "utf8");

    return NextResponse.json({
      ok: true,
      mode: "DEPLOY_HISTORY_RECORDED",
      record,
      message: "Deploy History registrado bajo Sello de Kairos.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "DEPLOY_HISTORY_FAIL" },
      { status: 500 }
    );
  }
}
