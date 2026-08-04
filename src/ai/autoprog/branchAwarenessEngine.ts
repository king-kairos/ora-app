import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalizeText(value: unknown) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function inferBranchFromIntent(intent: string) {
  const text = normalizeText(intent);

  if (text.includes("presence") || text.includes("presencia")) return "presence";
  if (text.includes("security") || text.includes("seguridad")) return "security";
  if (text.includes("health") || text.includes("salud")) return "health";
  if (text.includes("marketing")) return "marketing";
  if (text.includes("agriculture") || text.includes("agricultura")) return "agriculture";
  if (text.includes("pollera") || text.includes("pollo")) return "pollera";

  return "";
}

export function branchExists(branch: string) {
  if (!branch) return false;

  const checks = [
    path.join(ROOT, "app", branch, "page.tsx"),
    path.join(ROOT, "app", branch),
    path.join(ROOT, "src", branch),
  ];

  return checks.some((target) => fs.existsSync(target));
}

export function analyzeBranchAwareness(intent: string) {
  const branch = inferBranchFromIntent(intent);
  const exists = branchExists(branch);

  const mode = exists ? "evolve_existing_branch" : "create_new_branch";

  return {
    ok: true,
    branch,
    exists,
    mode,
    actionVerb: exists ? "Mejorar" : "Crear",
    message: exists
      ? `La rama ${branch} ya existe. ORA debe proponer evolución, no creación duplicada.`
      : `La rama ${branch || "desconocida"} no existe. ORA puede proponer creación inicial.`,
  };
}
