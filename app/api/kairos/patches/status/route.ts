export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function hasValidSeal(req: Request) {
  const expected = String(process.env.KAIROS_SEAL || "").trim();
  if (!expected) return false;

  const received = String(req.headers.get("x-kairos-seal") || "").trim();
  return received === expected;
}

function readJsonSafe(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    if (!hasValidSeal(req)) {
      return NextResponse.json(
        { ok: false, error: "SELLO_INVALIDO" },
        { status: 403 }
      );
    }

    const root = process.cwd();

    const dirs = [
      path.join(root, "ora-data/proposals"),
      path.join(root, "data/coherencia/proposals"),
      path.join(root, "ora-data/patches"),
      path.join(root, "data/coherencia/patches"),
    ];

    const items: any[] = [];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".json"));

      for (const file of files) {
        const fullPath = path.join(dir, file);
        const json = readJsonSafe(fullPath);
        if (!json) continue;

        const status = String(json.status || "pending").toLowerCase();

        items.push({
          id: json.id || file.replace(".json", ""),
          file,
          dir,
          title: json.title || json.summary || "Sin título",
          summary: json.summary || "",
          risk: json.risk || "unknown",
          status,
          target:
            json.target ||
            json.targetFile ||
            json.targetFiles ||
            json.files ||
            null,
          createdAt: json.createdAt || json.timestamp || null,
          approvedAt: json.approvedAt || null,
          appliedAt: json.appliedAt || null,
          publishedAt: json.publishedAt || null,
          lastAction:
            json.lastAction ||
            (json.publishedAt
              ? "published"
              : json.appliedAt
              ? "applied"
              : json.approvedAt
              ? "approved"
              : status),
          lastError: json.lastError || null,
          sourceFile: file,
        });
      }
    }

    const counts = {
      total: items.length,
      pending: items.filter((x) => x.status === "pending").length,
      approved: items.filter((x) => x.status === "approved").length,
      applied: items.filter((x) => x.status === "applied").length,
      published: items.filter((x) => x.status === "published").length,
      archived: items.filter((x) => x.status === "archived").length,
      denied: items.filter((x) => x.status === "denied" || x.status === "rejected").length,
    };

    return NextResponse.json({
      ok: true,
      counts,
      items: items.sort((a, b) => {
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return db - da;
      }),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "PATCH_STATUS_FAIL",
      },
      { status: 500 }
    );
  }
}
