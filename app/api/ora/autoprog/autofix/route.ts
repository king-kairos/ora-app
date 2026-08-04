export const runtime = "nodejs";

import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readFileSafe(filePath: string) {
  const full = path.join(process.cwd(), filePath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

function createProposal(filePath: string, content: string, summary: string) {
  const id = `autofix-${Date.now()}`;

  const proposal = {
    id,
    title: "AutoFix: reparación automática",
    summary,
    type: "patch",
    risk: "low",
    source: "autofix-v1",
    targetFiles: [filePath],
    files: [
      {
        path: filePath,
        content,
      },
    ],
    content,
    status: "pending",
    proposedBy: "rafael-autofix",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: {
      autofix: true,
    },
    version: 1,
  };

  const dir = path.join(process.cwd(), "ora-data", "proposals");
  ensureDir(dir);

  fs.writeFileSync(
    path.join(dir, `${id}.json`),
    JSON.stringify(proposal, null, 2),
    "utf8"
  );

  return proposal;
}

function injectMissingHealthStyles(original: string) {
  if (original.includes("const healthPatchCardStyle")) {
    return original;
  }

  const styles = `

const healthPatchCardStyle: React.CSSProperties = {
  border: "1px solid rgba(0,255,136,.35)",
  borderRadius: "18px",
  padding: "18px",
  marginTop: "18px",
  marginBottom: "18px",
  background: "rgba(0,255,65,.06)",
};

const healthPatchTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#8fff6a",
  fontSize: "22px",
  fontWeight: "bold",
};

const healthPatchTextStyle: React.CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#d9ffea",
  fontSize: "14px",
  opacity: 0.92,
};
`;

  if (original.includes("export default function")) {
    return original.replace("export default function", `${styles}\nexport default function`);
  }

  return `${styles}\n${original}`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/ora/autoprog/autofix",
    method: "POST",
    message: "AutoFix activo. Envía { error } o ejecuta POST vacío para crear reparación conocida.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const error = String(body?.error || "").toLowerCase();

    const healthFile = "app/health/page.tsx";
    const healthContent = readFileSafe(healthFile);

    if (!healthContent) {
      return NextResponse.json(
        {
          ok: false,
          error: "TARGET_NOT_FOUND",
          message: "No existe app/health/page.tsx.",
        },
        { status: 404 }
      );
    }

    if (
      error.includes("healthpatchcardstyle") ||
      error.includes("healthpatchtitlestyle") ||
      error.includes("healthpatchtextstyle") ||
      healthContent.includes("healthPatchCardStyle")
    ) {
      const fixed = injectMissingHealthStyles(healthContent);

      if (fixed === healthContent) {
        return NextResponse.json({
          ok: true,
          changed: false,
          message: "No hacía falta AutoFix: los estilos ya existen.",
        });
      }

      const proposal = createProposal(
        healthFile,
        fixed,
        "AutoFix detectó estilos faltantes en ORA Health y propone agregarlos para reparar el build."
      );

      return NextResponse.json({
        ok: true,
        changed: true,
        proposal,
        message: "AutoFix generó propuesta pendiente para reparar estilos faltantes.",
      });
    }

    const fixed = injectMissingHealthStyles(healthContent);

    if (fixed === healthContent) {
      return NextResponse.json({
        ok: true,
        changed: false,
        message: "AutoFix no encontró reparación necesaria.",
      });
    }

    const proposal = createProposal(
      healthFile,
      fixed,
      "AutoFix preventivo: agrega estilos faltantes usados por patches de ORA Health."
    );

    return NextResponse.json({
      ok: true,
      changed: true,
      proposal,
      message: "AutoFix generó propuesta preventiva.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "AUTOFIX_FAILED",
        message: "No se pudo ejecutar AutoFix.",
      },
      { status: 500 }
    );
  }
}
