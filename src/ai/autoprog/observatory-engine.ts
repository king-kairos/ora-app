import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();

export type ObservatoryReport = {
  scannedAt: string;
  pages: string[];
  apiRoutes: string[];
  aiModules: string[];
  autoprogModules: string[];
  warnings: string[];
  stats: {
    pagesCount: number;
    apiRoutesCount: number;
    aiModulesCount: number;
    autoprogModulesCount: number;
  };
};

async function safeReadDir(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}

async function walk(dir: string, base = ROOT): Promise<string[]> {
  const entries = await safeReadDir(dir);
  const results: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry);

    let stat;
    try {
      stat = await fs.stat(full);
    } catch {
      continue;
    }

    const rel = path.relative(base, full);

    if (
      rel.startsWith(".git") ||
      rel.startsWith("node_modules") ||
      rel.startsWith(".next") ||
      rel.startsWith("ora-data/backups")
    ) {
      continue;
    }

    if (stat.isDirectory()) {
      const nested = await walk(full, base);
      results.push(...nested);
    } else {
      results.push(rel);
    }
  }

  return results;
}

function nowIso() {
  return new Date().toISOString();
}

export async function runObservatoryScan(): Promise<ObservatoryReport> {
  const files = await walk(ROOT);

  const pages = files.filter(
    (f) =>
      f.startsWith("app/") &&
      (f.endsWith("/page.tsx") || f.endsWith("/page.ts"))
  );

  const apiRoutes = files.filter(
    (f) =>
      f.startsWith("app/api/") &&
      (f.endsWith("/route.ts") || f.endsWith("/route.js"))
  );

  const aiModules = files.filter(
    (f) =>
      f.startsWith("src/ai/") &&
      (f.endsWith(".ts") || f.endsWith(".tsx"))
  );

  const autoprogModules = files.filter(
    (f) =>
      f.startsWith("src/ai/autoprog/") &&
      (f.endsWith(".ts") || f.endsWith(".tsx"))
  );

  const warnings: string[] = [];

  if (autoprogModules.length === 0) {
    warnings.push("No se detectaron módulos dentro de src/ai/autoprog.");
  }

  if (!apiRoutes.some((f) => f.includes("/autoprog/"))) {
    warnings.push("No se detectaron rutas API de autoprog.");
  }

  if (!pages.some((f) => f === "app/kairos/page.tsx")) {
    warnings.push("No se detectó app/kairos/page.tsx.");
  }

  return {
    scannedAt: nowIso(),
    pages,
    apiRoutes,
    aiModules,
    autoprogModules,
    warnings,
    stats: {
      pagesCount: pages.length,
      apiRoutesCount: apiRoutes.length,
      aiModulesCount: aiModules.length,
      autoprogModulesCount: autoprogModules.length,
    },
  };
}
