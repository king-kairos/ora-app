// src/ai/autoprog/apply.ts
import type { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs/promises";

type PatchFile = {
  path: string;
  content?: string;
  delete?: boolean;
};

type PatchPayload = {
  title?: string;
  notes?: string;
  files: PatchFile[];
};

const ALLOW_PREFIX = ["src/", "public/", "data/"];
const BLOCK_EXT = [".sh", ".bash", ".zsh", ".exe", ".dll"];

function normalizeRel(p: string) {
  const rel = String(p || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!rel) throw new Error("empty_path");
  if (rel.includes("..")) throw new Error("path_traversal");
  return rel;
}

function isAllowed(rel: string) {
  if (!ALLOW_PREFIX.some((pre) => rel.startsWith(pre))) return false;
  if (BLOCK_EXT.some((ext) => rel.toLowerCase().endsWith(ext))) return false;
  return true;
}

export async function autoprogApply(req: Request, res: Response) {
  try {
    const envSeal = process.env.KAIROS_SEAL;
    if (!envSeal) {
      return res.status(500).json({ ok: false, error: "Falta KAIROS_SEAL en env" });
    }

    const seal =
      (req.header("x-kairos-seal") as string | undefined) ||
      (req.body?.seal as string | undefined);

    if (!seal || seal !== envSeal) {
      return res.status(401).json({ ok: false, error: "Sello inválido o faltante" });
    }

    const patch: PatchPayload | undefined = req.body?.patch;
    if (!patch || !Array.isArray(patch.files)) {
      return res.status(400).json({ ok: false, error: "Body inválido: falta patch.files[]" });
    }

    const ROOT = process.cwd();
    const applied: any[] = [];

    for (const f of patch.files) {
      const rel = normalizeRel(f?.path as any);
      if (!isAllowed(rel)) return res.status(400).json({ ok: false, error: `path_not_allowed:${rel}` });

      const abs = path.join(ROOT, rel);

      const wantsDelete = f?.delete === true;
      if (wantsDelete) {
        try {
          await fs.unlink(abs);
          applied.push({ path: rel, action: "deleted", ok: true });
        } catch (e: any) {
          if (e?.code === "ENOENT") applied.push({ path: rel, action: "deleted", ok: true, note: "missing_ok" });
          else throw e;
        }
        continue;
      }

      const content = String(f?.content ?? "");
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, "utf8");
      applied.push({ path: rel, action: "written", ok: true, bytes: content.length });
    }

    return res.json({ ok: true, appliedCount: applied.length, results: applied });
  } catch (err: any) {
    console.error("❌ APPLY ERROR:", err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || "Error desconocido" });
  }
}
