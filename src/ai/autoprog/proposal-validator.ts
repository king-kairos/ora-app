export function validateProposal(p: any) {
  if (!p) return { ok: false, reason: "empty" };

  const hasTarget =
    (typeof p.target === "string" && p.target.trim() !== "") ||
    (typeof p.targetFile === "string" && p.targetFile.trim() !== "") ||
    (Array.isArray(p.targetFiles) &&
      p.targetFiles.some((t: any) => typeof t === "string" && t.trim() !== "")) ||
    (Array.isArray(p.files) &&
      p.files.some((f: any) => typeof f?.path === "string" && f.path.trim() !== ""));

  if (!hasTarget) {
    return { ok: false, reason: "no_target" };
  }

  const hasContent =
    (typeof p.content === "string" && p.content.trim() !== "") ||
    (Array.isArray(p.files) &&
      p.files.some((f: any) => typeof f?.content === "string" && f.content.trim() !== ""));

  if (!hasContent) {
    return { ok: false, reason: "no_content" };
  }

  return { ok: true };
}
