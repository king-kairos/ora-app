import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    const proposalDirA = path.join(process.cwd(), "data/coherencia/proposals");
    const proposalDirB = path.join(process.cwd(), "ora-data/proposals");

    const proposalDir = fs.existsSync(proposalDirB) ? proposalDirB : proposalDirA;

    if (!fs.existsSync(proposalDir)) {
      return NextResponse.json({
        ok: false,
        error: "No existe directorio de proposals",
      });
    }

    const file = fs.readdirSync(proposalDir).find((f) => f.includes(id));

    if (!file) {
      return NextResponse.json({ ok: false, error: "proposal not found" });
    }

    const proposalPath = path.join(proposalDir, file);
    const proposal = JSON.parse(fs.readFileSync(proposalPath, "utf8"));

    if (proposal.status === "applied") {
      return NextResponse.json({
        ok: true,
        alreadyApplied: true,
        message: "La proposal ya estaba aplicada",
      });
    }

    if (proposal.patch && proposal.target) {
      const target = path.join(process.cwd(), proposal.target);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, proposal.patch, "utf8");
    }

    if (Array.isArray(proposal.files)) {
      for (const fileEntry of proposal.files) {
        if (!fileEntry?.path) continue;
        const target = path.join(process.cwd(), fileEntry.path);
        fs.mkdirSync(path.dirname(target), { recursive: true });

        if (fileEntry.content) {
          fs.writeFileSync(target, fileEntry.content, "utf8");
        }
      }
    }

    proposal.status = "applied";
    proposal.appliedAt = new Date().toISOString();

    fs.writeFileSync(proposalPath, JSON.stringify(proposal, null, 2));

    let buildOutput = "";
    let restartOutput = "";

    try {
      buildOutput = execSync("npm run build", {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe",
      });

      restartOutput = execSync("pm2 restart ora", {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe",
      });
    } catch (buildError: any) {
      return NextResponse.json({
        ok: false,
        error: "Se aplicó la proposal, pero falló el build o restart",
        proposalApplied: true,
        stdout: buildError?.stdout?.toString?.() || "",
        stderr: buildError?.stderr?.toString?.() || "",
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Proposal aplicada, build ejecutado y ORA reiniciado",
      buildOutput,
      restartOutput,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
    });
  }
}
