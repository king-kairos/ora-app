// src/autoprog/normalizePatch.ts

export type PatchFile = { path: string; diff: string };
export type Patch = { files: PatchFile[] };

// Convierte un unified diff string en { files:[{path,diff}] }
export function patchFromUnifiedDiff(unified: string): Patch {
  const m = unified.match(/^Index:\s+(.+)$/m);
  const path = (m?.[1] || "unknown.txt").trim();
  return { files: [{ path, diff: unified }] };
}

// Acepta cualquiera de estas formas y garantiza patch.files[]
export function ensurePatchFiles(patch: any): Patch {
  if (!patch) throw new Error("Patch inválido: vacío.");

  // Ya viene como { files:[...] }
  if (Array.isArray(patch.files) && patch.files.length) return patch as Patch;

  // Viene como string (unified diff)
  if (typeof patch === "string") return patchFromUnifiedDiff(patch);

  // Viene como { patch: "diff..." }
  if (typeof patch.patch === "string") return patchFromUnifiedDiff(patch.patch);

  // Viene como { diff: "diff..." }
  if (typeof patch.diff === "string") return patchFromUnifiedDiff(patch.diff);

  throw new Error("Patch inválido: no se pudo normalizar a files[].");
}
