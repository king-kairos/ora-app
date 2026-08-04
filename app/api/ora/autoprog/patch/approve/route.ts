import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const DIRS = [
  path.join(process.cwd(), "data", "patches"),
  path.join(process.cwd(), "ora-data", "proposals"),
  path.join(process.cwd(), "data", "coherencia", "proposals"),
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id requerido" },
        { status: 400 }
      );
    }

    let foundPath = "";

    for (const dir of DIRS) {
      if (!fs.existsSync(dir)) continue;

      const file = fs
        .readdirSync(dir)
        .find((f) => f.endsWith(".json") && f.includes(id));

      if (file) {
        foundPath = path.join(dir, file);
        break;
      }
    }

    if (!foundPath) {
      return NextResponse.json(
        { ok: false, error: "proposal not found", id, dirs: DIRS },
        { status: 404 }
      );
    }

    const proposal = JSON.parse(fs.readFileSync(foundPath, "utf8"));

    proposal.status = "approved";
    proposal.approvedAt = new Date().toISOString();
    proposal.updatedAt = new Date().toISOString();

    fs.writeFileSync(foundPath, JSON.stringify(proposal, null, 2));

    return NextResponse.json({
      ok: true,
      id,
      status: "approved",
      file: foundPath,
      message: "Proposal aprobada correctamente",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
