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

function getAllowedSeals() {
  return [process.env.KAIROS_SEAL]
    .filter(Boolean)
    .map((x) => String(x).trim());
}

async function safeReadJson(file: string) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function dirExists(dir: string) {
  try {
    const st = await fs.stat(dir);
    return st.isDirectory();
  } catch {
    return false;
  }
}

function normalizeItem(json: any, extra: any = {}) {
  const status = String(json?.status || "pending").trim().toLowerCase();
  const archived = json?.archived === true || status === "archived";

  return {
    ...json,
    id: String(json?.id || extra.id || "").trim(),
    status,
    archived,
    ...extra,
  };
}

async function readMainDb() {
  const db = await safeReadJson(DB_FILE);
  const rawItems = Array.isArray(db)
    ? db
    : Array.isArray(db?.proposals)
    ? db.proposals
    : [];

  return rawItems
    .map((item: any) =>
      normalizeItem(item, {
        sourceFile: "patches.json",
        sourceDir: path.dirname(DB_FILE),
        sourceType: "main-db",
      })
    )
    .filter((item: any) => item.id && item.archived !== true);
}

async function readJsonFilesFromDir(dir: string) {
  const exists = await dirExists(dir);
  if (!exists) return [];

  const files = await fs.readdir(dir);
  const items: any[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    try {
      const full = path.join(dir, file);
      const json = await safeReadJson(full);
      if (!json) continue;

      const item = normalizeItem(json, {
        id: json?.id || file.replace(/\.json$/, ""),
        sourceFile: file,
        sourceDir: dir,
        sourceType: "json-file",
      });

      if (item.archived === true) continue;

      items.push(item);
    } catch {
      // ignora JSON corrupto
    }
  }

  return items;
}

function getTimeValue(item: any) {
  const value = item?.createdAt || item?.updatedAt || item?.ts || 0;
  if (typeof value === "number") return value;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(req: Request) {
  try {
    const seal = String(
      req.headers.get("x-kairos-seal") ||
        req.headers.get("kairos-seal") ||
        ""
    ).trim();

    const allowed = getAllowedSeals();

    if (allowed.length > 0 && (!seal || !allowed.includes(seal))) {
      return NextResponse.json(
        { ok: false, error: "Invalid seal" },
        { status: 401 }
      );
    }

    let patches: any[] = [];

    patches = patches.concat(await readMainDb());

    for (const dir of PATCH_DIRS) {
      patches = patches.concat(await readJsonFilesFromDir(dir));
    }

    const seen = new Set<string>();

    const unique = patches.filter((p) => {
      const id = String(p?.id || "").trim();
      if (!id) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    unique.sort((a, b) => getTimeValue(b) - getTimeValue(a));

    return NextResponse.json({
      ok: true,
      items: unique,
      patches: unique,
      total: unique.length,
      dbFile: DB_FILE,
      dirs: PATCH_DIRS,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "PATCH_LIST_FAIL" },
      { status: 500 }
    );
  }
}

