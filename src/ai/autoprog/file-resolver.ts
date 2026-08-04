import fs from "fs";
import path from "path";

type ResolveResult = {
  targetFiles: string[];
  reason: string;
};

function exists(filePath: string) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

export function resolveFilesFromIntent(input: string): ResolveResult {
  const text = String(input || "").toLowerCase();

  const targets: string[] = [];

  if (text.includes("kairos") || text.includes("cabina")) {
    if (exists("app/kairos/page.tsx")) targets.push("app/kairos/page.tsx");
    if (exists("app/kairos/KairosBuilderPanel.tsx")) targets.push("app/kairos/KairosBuilderPanel.tsx");
    if (exists("app/kairos/KairosControlPanel.tsx")) targets.push("app/kairos/KairosControlPanel.tsx");
  }

  if (text.includes("propuesta") || text.includes("patch") || text.includes("parche")) {
    if (exists("app/kairos/page.tsx")) targets.push("app/kairos/page.tsx");
    if (exists("app/api/kairos-action/route.ts")) targets.push("app/api/kairos-action/route.ts");
    if (exists("src/autoprog/applyPatch.ts")) targets.push("src/autoprog/applyPatch.ts");
  }

  if (text.includes("intent") || text.includes("intención")) {
    if (exists("app/api/ora/intent/route.ts")) targets.push("app/api/ora/intent/route.ts");
    if (exists("src/ai/autoprog/intent-parser.ts")) targets.push("src/ai/autoprog/intent-parser.ts");
    if (exists("src/ai/autoprog/proposal-from-intent.ts")) targets.push("src/ai/autoprog/proposal-from-intent.ts");
  }

  const unique = Array.from(new Set(targets));

  if (unique.length > 0) {
    return {
      targetFiles: unique,
      reason: "Archivos encontrados por contexto de intención.",
    };
  }

  return {
    targetFiles: [],
    reason: "No se detectaron archivos existentes; se debe crear módulo nuevo.",
  };
}
