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

const ARCHIVABLE = new Set([
  "pending",
  "approved",
  "applied",
  "published",
  "rejected",
  "denied",
  "error",
  "failed",
  "fail",
  "manual",
  "unknown",
]);

function cleanStatus(value: any) {
  return String(value || "pending").trim().toLowerCase();
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

function archiveItem(item: any, now: number) {
  return {
    ...item,
    status: "archived",
    archived: true,
    updatedAt: now,
    archivedAt: now,
  };
}

function isVisibleArchivable(item: any) {
  const status = cleanStatus(item?.status);
  const archived = item?.archived === true || status === "archived";

  if (archived) return false;

  return ARCHIVABLE.has(status);
}

async function archiveMainDb(now: number) {
  const db = await safeReadJson(DB_FILE);
  const items = Array.isArray(db)
    ? db
    : Array.isArray(db?.proposals)
    ? db.proposals
    : [];

  let count = 0;

  const next = items.map((p: any) => {
    if (!isVisibleArchivable(p)) return p;

    count++;
    return archiveItem(p, now);
  });

  if (count > 0) {
    await safeWriteJson(DB_FILE, { proposals: next });
  }

  return count;
}

async function archiveProposalFiles(now: number) {
  let count = 0;

  for (const dir of PATCH_DIRS) {
    try {
      const files = await fs.readdir(dir);

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const full = path.join(dir, file);
        const json = await safeReadJson(full);
        if (!json) continue;

        if (!isVisibleArchivable(json)) continue;

        await safeWriteJson(full, archiveItem(json, now));
        count++;
      }
    } catch {
      // carpeta inexistente
    }
  }

  return count;
}

export async function POST() {
  try {
    const now = Date.now();

    const dbArchived = await archiveMainDb(now);
    const fileArchived = await archiveProposalFiles(now);

    return NextResponse.json({
      ok: true,
      mode: "ARCHIVE_VISIBLE_PROPOSALS",
      dbArchived,
      fileArchived,
      totalArchived: dbArchived + fileArchived,
      message: "Propuestas visibles archivadas correctamente.",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "ARCHIVE_VISIBLE_FAIL",
      },
      { status: 500 }
    );
  }
}
