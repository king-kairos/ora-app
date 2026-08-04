type IntentResult = {
  ok: boolean;
  intent: string;
  target?: string;
  description?: string;
  raw: string;
};

function cleanModuleName(text: string) {
  return text
    .replace("crear", "")
    .replace("módulo", "")
    .replace("modulo", "")
    .trim();
}

export function parseIntent(input: string): IntentResult {
  const text = String(input || "").toLowerCase().trim();

  if (!text) {
    return {
      ok: false,
      intent: "unknown",
      raw: input,
    };
  }

  if (text.includes("crear") && (text.includes("módulo") || text.includes("modulo"))) {
    const name = cleanModuleName(text) || "modulo-ora";

    return {
      ok: true,
      intent: "create_module",
      target: name,
      description: text,
      raw: input,
    };
  }

  if (text.includes("repara") || text.includes("arregla")) {
    return {
      ok: true,
      intent: "fix_module",
      description: text,
      raw: input,
    };
  }

  return {
    ok: true,
    intent: "generic",
    description: text,
    raw: input,
  };
}
