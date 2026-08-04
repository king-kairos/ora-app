import fs from "fs";
import path from "path";

type PatchFile = {
  path: string;
  content: string;
};

export function applyPatch(
  files: PatchFile[],
  kairosRoot: string
) {
  if (kairosRoot !== process.env.KAIROS_ROOT) {
    throw new Error("Unauthorized: KAIROS.ROOT required");
  }

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content, "utf-8");
  }

  return {
    ok: true,
    appliedFiles: files.map(f => f.path)
  };
}
