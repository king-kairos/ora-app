import fs from "fs";
import path from "path";
import { ORA_BRANCH_REGISTRY } from "../branches/branchRegistry";

const ROOT = process.cwd();

function exists(relativePath: string) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function scoreBranch(branchId: string, expectedModules: string[]) {
  const baseFiles = [
    `app/${branchId}/page.tsx`,
    `src/${branchId}/types.ts`,
    `src/${branchId}/mockData.ts`,
  ];

  const existingBase = baseFiles.filter(exists).length;
  const moduleScore = Math.round((existingBase / baseFiles.length) * 40);

  const componentDir = path.join(ROOT, `app/${branchId}/components`);
  const componentCount = fs.existsSync(componentDir)
    ? fs.readdirSync(componentDir).filter((f) => f.endsWith(".tsx")).length
    : 0;

  const componentScore = Math.min(40, componentCount * 8);

  const apiDir = path.join(ROOT, `app/api/${branchId}`);
  const apiScore = fs.existsSync(apiDir) ? 20 : 0;

  return Math.min(100, moduleScore + componentScore + apiScore);
}

function detectMissing(branchId: string, expectedModules: string[]) {
  const missing: string[] = [];

  if (!exists(`app/${branchId}/page.tsx`)) missing.push("page");
  if (!exists(`src/${branchId}/types.ts`)) missing.push("types");
  if (!exists(`src/${branchId}/mockData.ts`)) missing.push("mockData");
  if (!fs.existsSync(path.join(ROOT, `app/${branchId}/components`))) missing.push("components");
  if (!fs.existsSync(path.join(ROOT, `app/api/${branchId}`))) missing.push("api");

  for (const module of expectedModules) {
    const guess = module.toLowerCase();
    const componentDir = path.join(ROOT, `app/${branchId}/components`);
    const found =
      fs.existsSync(componentDir) &&
      fs.readdirSync(componentDir).some((file) =>
        file.toLowerCase().includes(guess)
      );

    if (!found) missing.push(module);
  }

  return Array.from(new Set(missing));
}

export function analyzeBranchEvolution() {
  const branches = ORA_BRANCH_REGISTRY.map((branch) => {
    const score = scoreBranch(branch.branchId, branch.expectedModules);
    const missing = detectMissing(branch.branchId, branch.expectedModules);

    const priority =
      score < 40 ? "high" :
      score < 70 ? "medium" :
      "low";

    return {
      branchId: branch.branchId,
      name: branch.name,
      route: branch.route,
      status: branch.status,
      observerEssence: branch.observerEssence,
      cloneEssence: branch.cloneEssence,
      healthScore: score,
      missing,
      priority,
      suggestion: missing.length
        ? `Fortalecer ${branch.name}: faltan ${missing.slice(0, 5).join(", ")}.`
        : `${branch.name} está estable para la siguiente fase.`,
      rule:
        "La rama usa clon operativo aislado. El observador celestial recomienda evolución. Ningún cambio se ejecuta sin Sello de Kairos.",
    };
  });

  return {
    ok: true,
    mode: "BRANCH_EVOLUTION_ENGINE",
    branches,
    createdAt: new Date().toISOString(),
  };
}
