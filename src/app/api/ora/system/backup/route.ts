import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);
const ROOT = process.cwd();

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const expectedSeal = process.env.KAIROS_SEAL || "";

    const seal =
      req.headers.get("kairos-seal") ||
      req.headers.get("x-kairos-seal") ||
      "";

    if (!seal || seal !== expectedSeal) {
      return NextResponse.json({
        ok: false,
        error: "Missing seal",
      });
    }

    const stamp = timestamp();

    const SNAPSHOT_DIR = path.join(
      ROOT,
      "ora-backups",
      "snapshots",
      stamp
    );

    await ensureDir(SNAPSHOT_DIR);

    const targets = [
      "src",
      "app",
      "ora-data",
      "package.json",
      "package-lock.json",
      "next.config.js",
      "next.config.ts",
      "tsconfig.json",
      ".env",
      ".env.local",
    ];

    const copied: string[] = [];

    for (const target of targets) {
      const full = path.join(ROOT, target);

      try {
        await fs.access(full);

        const dest = path.join(SNAPSHOT_DIR, target);
        await ensureDir(path.dirname(dest));

        await execAsync(`cp -r "${full}" "${dest}"`);

        copied.push(target);
      } catch {
        // ignorar si no existe
      }
    }

    return NextResponse.json({
      ok: true,
      backup: stamp,
      snapshotDir: SNAPSHOT_DIR,
      copied,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || String(err),
    });
  }
}
