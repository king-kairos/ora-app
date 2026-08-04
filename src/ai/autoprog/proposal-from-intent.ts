// src/ai/autoprog/proposal-from-intent.ts
import fs from "fs";
import path from "path";
import { parseIntent } from "./intent-parser";
import { resolveFilesFromIntent } from "./file-resolver";

function cleanIntentName(input: string) {
  let text = String(input || "").trim().toLowerCase();

  text = text
    .replace(/^crea\s+/i, "")
    .replace(/^crear\s+/i, "")
    .replace(/^haz\s+/i, "")
    .replace(/^hacer\s+/i, "")
    .replace(/^genera\s+/i, "")
    .replace(/^generar\s+/i, "")
    .replace(/^construye\s+/i, "")
    .replace(/^construir\s+/i, "")
    .replace(/^agrega\s+/i, "")
    .replace(/^agregar\s+/i, "")
    .replace(/^en\s+ora\s+health\s+/i, "");

  text = text
    .replace(/^una\s+/i, "")
    .replace(/^un\s+/i, "")
    .replace(/^la\s+/i, "")
    .replace(/^el\s+/i, "");

  text = text
    .replace(/^página\s+llamada\s+/i, "")
    .replace(/^pagina\s+llamada\s+/i, "")
    .replace(/^página\s+/i, "")
    .replace(/^pagina\s+/i, "")
    .replace(/^módulo\s+llamado\s+/i, "")
    .replace(/^modulo\s+llamado\s+/i, "")
    .replace(/^módulo\s+/i, "")
    .replace(/^modulo\s+/i, "")
    .replace(/^ruta\s+llamada\s+/i, "")
    .replace(/^ruta\s+/i, "");

  return text.trim() || "modulo-ora";
}

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s-_]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function pageContent(name: string, description: string) {
  const title = name
    .split("-")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");

  return `export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>${title}</h1>
      <p>${description || "Módulo creado por ORA Autoprog."}</p>
    </main>
  );
}
`;
}

function resolveDirectTarget(input: string) {
  const text = String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const isOraHealth =
    text.includes("ora health") ||
    text.includes("health") ||
    text.includes("clinico") ||
    text.includes("clinica") ||
    text.includes("paciente") ||
    text.includes("doctor") ||
    text.includes("consulta") ||
    text.includes("receta") ||
    text.includes("analitica");
  if (isOraHealth) {
    if (fs.existsSync(path.join(process.cwd(), "app/health/page.tsx"))) {
      return "app/health/page.tsx";
    }
    if (fs.existsSync(path.join(process.cwd(), "app/ora-health-smg/page.tsx"))) {
      return "app/ora-health-smg/page.tsx";
    }
  }
  return null;
}

function makeHealthCard(intent: string) {
  const clean = String(intent || "")
    .replace(/^en\s+ora\s+health\s+/i, "")
    .replace(/^agrega\s+/i, "")
    .replace(/^agregar\s+/i, "")
    .replace(/^una\s+/i, "")
    .replace(/^un\s+/i, "")
    .replace(/^tarjeta\s+pequeña\s+/i, "")
    .replace(/^tarjeta\s+pequena\s+/i, "")
    .replace(/^en\s+el\s+dashboard\s+que\s+diga\s+/i, "")
    .replace(/^que\s+diga\s+/i, "")
    .trim();

  return `
        <section style={healthPatchCardStyle}>
          <h3 style={healthPatchTitleStyle}>Estado Rafael</h3>
          <p style={healthPatchTextStyle}>
            ${clean || "Activo en supervisión clínica."}
          </p>
        </section>`;
}

function ensureHealthStyles(source: string) {
  let updated = source;

  if (!updated.includes("healthPatchCardStyle")) {
    updated += `

const healthPatchCardStyle: CSSProperties = {
  border: "1px solid rgba(0,255,136,.35)",
  borderRadius: "18px",
  padding: "18px",
  marginTop: "18px",
  marginBottom: "18px",
  background: "rgba(0,255,65,.06)",
};

const healthPatchTitleStyle: CSSProperties = {
  margin: 0,
  color: "#8fff6a",
  fontSize: "18px",
  fontWeight: "bold",
};

const healthPatchTextStyle: CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#d9ffea",
  fontSize: "14px",
  opacity: 0.92,
};
`;
  }

  return updated;
}

function insertHealthCard(source: string, intent: string) {
  if (source.includes("Estado Rafael")) return source;

  let updated = source;
  const card = makeHealthCard(intent);

  if (updated.includes("<div style={topActionsGridStyle}>")) {
    updated = updated.replace(
      "<div style={topActionsGridStyle}>",
      `${card}
          <div style={topActionsGridStyle}>`
    );
  } else if (updated.includes("<div style={statsGridStyle}>")) {
    updated = updated.replace(
      "<div style={statsGridStyle}>",
      `${card}
          <div style={statsGridStyle}>`
    );
  } else if (updated.includes("<div style={headerRowStyle}>")) {
    updated = updated.replace(
      "<div style={headerRowStyle}>",
      `<div style={headerRowStyle}>${card}`
    );
  } else if (updated.includes("</main>")) {
    updated = updated.replace("</main>", `${card}\n    </main>`);
  } else if (updated.includes("return (")) {
    updated = updated.replace("return (", `return (\n${card}`);
  } else {
    updated += `\n\n// ORA PATCH HEALTH: ${intent}\n`;
  }

  return ensureHealthStyles(updated);
}

function patchExistingFile(filePath: string, intent: string) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return null;

  const original = fs.readFileSync(fullPath, "utf8");
  let updated = original;

  const text = intent.toLowerCase();

  if (filePath === "app/health/page.tsx" || filePath === "app/ora-health-smg/page.tsx") {
    updated = insertHealthCard(updated, intent);
  } else if (text.includes("titulo") || text.includes("title")) {
    updated = updated.replace(/<h1>(.*?)<\/h1>/, `<h1>${intent}</h1>`);
  } else if (text.includes("agrega") || text.includes("agregar")) {
    updated += `\n\n// ORA PATCH: ${intent}\n`;
  }

  return updated !== original ? { path: filePath, content: updated } : null;
}

export function createProposalFromIntent(input: string) {
  const parsed = parseIntent(input);

  if (!parsed.ok) {
    return {
      ok: false,
      message: "No se pudo interpretar la intención",
    };
  }

  const id = `intent-${Date.now()}`;
  let files: any[] = [];

  const directTarget = resolveDirectTarget(input);

  if (directTarget) {
    const patched = patchExistingFile(directTarget, input);
    if (patched) files.push(patched);
  }

  if (files.length === 0) {
    const resolved = resolveFilesFromIntent(input);

    if (resolved.targetFiles.length > 0) {
      for (const file of resolved.targetFiles) {
        const patched = patchExistingFile(file, input);
        if (patched) files.push(patched);
      }
    }
  }

  // 🔥 NUEVO: Forzar patch sobre health en lugar de bloquear
  const normalizedInput = String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const isProtectedOraHealthIntent =
    normalizedInput.includes("ora health") ||
    normalizedInput.includes("health") ||
    normalizedInput.includes("clinico") ||
    normalizedInput.includes("clinica") ||
    normalizedInput.includes("paciente") ||
    normalizedInput.includes("doctor") ||
    normalizedInput.includes("consulta") ||
    normalizedInput.includes("receta") ||
    normalizedInput.includes("analitica");

  if (files.length === 0 && isProtectedOraHealthIntent) {
    const healthTarget = "app/health/page.tsx";
    const forcedPatch = patchExistingFile(healthTarget, input);
    if (forcedPatch) {
      files.push(forcedPatch);
    } else {
      const fullPath = path.join(process.cwd(), healthTarget);
      if (fs.existsSync(fullPath)) {
        const original = fs.readFileSync(fullPath, "utf8");
        const forcedContent =
          original +
          `\n\n// ORA FORCE PATCH:\n// ${input}\n`;
        files.push({
          path: healthTarget,
          content: forcedContent,
        });
      }
    }
  }

  // Si después de todo SIGUE sin archivos, crea página nueva
  if (files.length === 0) {
    const rawTarget = parsed.target || parsed.description || input || "modulo-ora";
    const name = slugify(cleanIntentName(rawTarget)) || "modulo-ora";
    const targetFile = `app/${name}/page.tsx`;
    const content = pageContent(name, parsed.description || input);

    files.push({
      path: targetFile,
      content,
    });
  }

  const proposal = {
    id,
    title: `Intent: ${parsed.intent || "auto"}`,
    summary: parsed.description || input,
    type: "patch",
    risk: "low",
    source: "autoprog-v2",
    targetFiles: files.map((f) => f.path),
    files,
    content: files.map((f) => f.content).join("\n\n"),
    status: "pending",
    proposedBy: "rafael",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const dir = path.join(process.cwd(), "ora-data", "proposals");
  ensureDir(dir);

  fs.writeFileSync(
    path.join(dir, `${id}.json`),
    JSON.stringify(proposal, null, 2),
    "utf8"
  );

  return {
    ok: true,
    proposal,
    message: "Propuesta generada desde intención.",
  };
}
