export const runtime = "nodejs";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import crypto from "crypto";
import { LOG_PATH, ensureDataDir } from "@/lib/ora/log";

const HOSTILE_REASONS = new Set([
  "forbidden_access",
  "unauthorized_action",
  "rate_limited",
  "rate_limited_bad_seal",
  "rate_limited_ban",
]);

export async function GET(req: Request) {
  const traceId = `INT-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
  if (req.headers.get("x-kairos-seal") !== process.env.KAIROS_SEAL) {
    return NextResponse.json({ ok: false, error: "No autorizado", traceId }, { status: 403 });
  }

  try {
    await ensureDataDir();
    const data = await fs.readFile(LOG_PATH, "utf-8").catch(() => "");
    const lines = data.split("\n").map(l => l.trim()).filter(Boolean);

    const intruders: any[] = [];
    for (let i = lines.length - 1; i >= 0 && intruders.length < 200; i--) {
      try {
        const ev = JSON.parse(lines[i]);
        if (HOSTILE_REASONS.has(String(ev?.reason || ""))) intruders.push(ev);
      } catch { continue; }
    }

    const stats: Record<string, number> = {};
    for (const e of intruders) {
      const r = String(e?.reason || "unknown");
      stats[r] = (stats[r] || 0) + 1;
    }

    return NextResponse.json({ ok: true, intruders, stats, traceId });
  } catch {
    return NextResponse.json({ ok: true, intruders: [], stats: {}, traceId });
  }
}
