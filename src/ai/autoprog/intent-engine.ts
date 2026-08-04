import { generateModuleTemplate } from "./module-generator-engine";
import { registerModule } from "./module-registry";

type IntentInput = {
  intent: string;
};

function normalize(input: string) {
  return String(input || "").trim().toLowerCase();
}

function safeName(input: string) {
  return normalize(input)
    .replace(/[^a-z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferBranch(moduleName: string) {
  if (
    moduleName.includes("business") ||
    moduleName.includes("pollera") ||
    moduleName.includes("granja")
  ) {
    return "business";
  }

  if (moduleName.includes("lottery") || moduleName.includes("loteria")) {
    return "lottery";
  }

  if (
    moduleName.includes("eco") ||
    moduleName.includes("public") ||
    moduleName.includes("camera") ||
    moduleName.includes("camara") ||
    moduleName.includes("gateway")
  ) {
    return "public-gateway";
  }

  if (
    moduleName.includes("community") ||
    moduleName.includes("comunidad") ||
    moduleName.includes("social")
  ) {
    return "community";
  }

  return "core-expansion";
}

function parseIntent(intent: string) {
  const cleaned = normalize(intent);

  const match =
    cleaned.match(/crear?\s+m[óo]dulo\s+(.+)/i) ||
    cleaned.match(/crea\s+m[óo]dulo\s+(.+)/i) ||
    cleaned.match(/nuevo\s+m[óo]dulo\s+(.+)/i);

  const rawName = match?.[1]?.trim() || cleaned;
  const moduleName = safeName(rawName);

  const title = `ORA — ${moduleName
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")}`;

  const description = `Módulo ${moduleName} generado desde intención por ORA.`;
  const branch = inferBranch(moduleName);

  return {
    moduleName,
    title,
    description,
    branch,
  };
}

export async function runIntentEngine(input: IntentInput) {
  const parsed = parseIntent(input.intent);

  if (!parsed.moduleName) {
    return {
      ok: false,
      error: "No se pudo interpretar un nombre de módulo desde la intención.",
    };
  }

  const generated = await generateModuleTemplate({
    moduleName: parsed.moduleName,
    title: parsed.title,
    description: parsed.description,
  });

  if (!generated.ok) {
    return generated;
  }

  const registry = registerModule({
    moduleName: parsed.moduleName,
    title: parsed.title,
    description: parsed.description,
    branch: parsed.branch,
    source: "intent-engine",
  });

  return {
    ok: true,
    intent: input.intent,
    parsed,
    generated,
    registry,
    message: `ORA interpretó la intención y generó el módulo ${parsed.moduleName}.`,
  };
}
