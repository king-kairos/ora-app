// src/ai/autoprog/parseAutoprogFromText.js
// Parser tolerante: extrae el primer JSON válido aunque venga con ```json ...``` o texto alrededor.

function extractFirstJsonObject(raw) {
  const s = String(raw || "");

  // 1) Si viene con ```...``` intenta sacar el contenido interno
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fence ? fence[1] : s;

  // 2) Limpia prefijos típicos: "json", ":" etc.
  const cleaned = candidate
    .replace(/^\s*json\s*/i, "")
    .replace(/^\s*[:\-–—]+\s*/, "")
    .trim();

  // 3) Busca el primer objeto balanceando llaves { ... }
  const start = cleaned.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inStr = false;
  let esc = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') inStr = false;
      continue;
    }

    if (ch === '"') { inStr = true; continue; }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) {
      return cleaned.slice(start, i + 1);
    }
  }

  return null;
}

function normalizeProposal(p) {
  if (!p || typeof p !== "object") throw new Error("INVALID_JSON");
  if (!Array.isArray(p.files)) throw new Error("INVALID_FILES");
  if (!p.title) p.title = "Autoprog";

  p.files = p.files
    .filter((f) => f && f.path)
    .map((f) => {
      const path = String(f.path).trim().replace(/\\/g, "/");
      const del = f.delete === true || String(f.delete || "").toLowerCase() === "true";

      // Si es delete, no necesita content
      if (del) return { path, delete: true };

      // Si no es delete, content por defecto ""
      const content = String(f.content ?? "");
      return { path, content };
    });

  if (p.files.length === 0) throw new Error("NO_FILES");
  return p;
}

export function parseAutoprogFromText(text) {
  try {
    const jsonText = extractFirstJsonObject(text);
    if (!jsonText) return { ok: false, error: "NO_JSON_FOUND" };

    const parsed = JSON.parse(jsonText);
    const proposal = normalizeProposal(parsed);

    return { ok: true, proposal };
  } catch (e) {
    return { ok: false, error: e?.message || "PARSE_ERROR" };
  }
}
