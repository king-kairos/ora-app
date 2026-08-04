export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DB_FILE = path.join(process.cwd(), "data", "patches.json");

const PATCH_DIRS = [
  path.join(process.cwd(), "data", "patches"),
  path.join(process.cwd(), "ora-data", "proposals"),
  path.join(process.cwd(), "data", "coherencia", "proposals"),
];

function cleanId(value: string) {
  return String(value || "").trim().replace(/\.json$/i, "");
}

async function safeReadJson(file: string) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function safeWriteJson(file: string, data: any) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

async function archiveInMainDb(id: string) {
  const db = await safeReadJson(DB_FILE);
  const items = Array.isArray(db)
    ? db
    : Array.isArray(db?.proposals)
    ? db.proposals
    : [];

  let changed = false;
  const now = Date.now();

  const next = items.map((p: any) => {
    if (cleanId(p?.id) !== id) return p;
    changed = true;
    return {
      ...p,
      status: "archived",
      archived: true,
      updatedAt: now,
      archivedAt: now,
    };
  });

  if (changed) {
    await safeWriteJson(DB_FILE, { proposals: next });
  }

  return changed;
}

async function archiveInProposalFiles(id: string) {
  let changed = false;
  const now = Date.now();

  for (const dir of PATCH_DIRS) {
    try {
      const files = await fs.readdir(dir);

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const full = path.join(dir, file);
        const json = await safeReadJson(full);
        if (!json) continue;

        const jsonId = cleanId(json?.id || file);

        if (jsonId !== id) continue;

        const updated = {
          ...json,
          id: json?.id || id,
          status: "archived",
          archived: true,
          updatedAt: now,
          archivedAt: now,
        };

        await safeWriteJson(full, updated);
        changed = true;
      }
    } catch {
      // ignora carpeta inexistente
    }
  }

  return changed;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = cleanId(rawId);

    const db = await safeReadJson(DB_FILE);
    const items = Array.isArray(db)
      ? db
      : Array.isArray(db?.proposals)
      ? db.proposals
      : [];

    const found = items.find((p: any) => cleanId(p?.id) === id);

    if (found) {
      return NextResponse.json({
        ok: true,
        mode: "PROPOSAL_REVIEW_DETAIL",
        proposal: found,
      });
    }

    for (const dir of PATCH_DIRS) {
      try {
        const files = await fs.readdir(dir);

        for (const file of files) {
          if (!file.endsWith(".json")) continue;

          const full = path.join(dir, file);
          const json = await safeReadJson(full);
          if (!json) continue;

          if (cleanId(json?.id || file) === id) {
            return NextResponse.json({
              ok: true,
              mode: "PROPOSAL_REVIEW_DETAIL",
              proposal: {
                ...json,
                id: json?.id || id,
              },
            });
          }
        }
      } catch {}
    }

    return NextResponse.json(
      { ok: false, error: "PROPOSAL_NOT_FOUND" },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "PROPOSAL_REVIEW_FAIL" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = cleanId(rawId);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim().toLowerCase();

    if (action !== "archive") {
      return NextResponse.json(
        { ok: false, error: "INVALID_ACTION", allowed: ["archive"] },
        { status: 400 }
      );
    }

    const dbChanged = await archiveInMainDb(id);
    const fileChanged = await archiveInProposalFiles(id);

    if (!dbChanged && !fileChanged) {
      return NextResponse.json(
        { ok: false, error: "PROPOSAL_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode: "PROPOSAL_ARCHIVED",
      id,
      dbChanged,
      fileChanged,
      message: "Proposal archivada correctamente.",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "PROPOSAL_ARCHIVE_FAIL" },
      { status: 500 }
    );
  }
}
