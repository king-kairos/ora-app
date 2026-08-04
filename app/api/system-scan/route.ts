import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createAutoProposal } from "../../../src/autoprog/autolearn";

function safeCount(dirPath: string, ext?: string) {
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);
  if (!ext) return files.length;
  return files.filter((file) => file.endsWith(ext)).length;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const moduleName = body?.moduleName;

    const validModules = ["rafael", "kaerliana", "orion", "arturo"];
    if (!validModules.includes(moduleName)) {
      return NextResponse.json(
        {
          ok: false,
          message: "moduleName inválido. Usa: rafael, kaerliana, orion, arturo",
        },
        { status: 400 }
      );
    }

    const baseDir = path.join(process.cwd(), "ora-data");
    const proposalsDir = path.join(baseDir, "proposals");
    const historyDir = path.join(baseDir, "history");
    const backupsDir = path.join(baseDir, "backups");

    const status = {
      proposals: safeCount(proposalsDir, ".json"),
      history: safeCount(historyDir, ".json"),
      backups: safeCount(backupsDir),
      scannedAt: new Date().toISOString(),
      moduleName,
    };

    const result = createAutoProposal(moduleName);

    return NextResponse.json(
      {
        ok: true,
        message: "Auto-análisis ejecutado y propuesta generada",
        scan: status,
        proposal: {
          proposalId: result.proposalId,
          origin: result.proposal.origin,
          title: result.proposal.title,
          target: result.proposal.target,
          risk: result.proposal.risk,
          status: result.proposal.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
