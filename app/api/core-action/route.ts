export const runtime = "nodejs";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(req: Request) {
  const traceId = `ORA-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
  const logPath = path.join(process.cwd(), "data/history.jsonl");

  try {
    await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });

    if (req.headers.get("x-kairos-seal") !== process.env.KAIROS_SEAL) {
      await fs
        .appendFile(
          logPath,
          JSON.stringify({
            traceId,
            timestamp: new Date().toISOString(),
            ok: false,
            reason: "invalid_seal",
          }) + "\n"
        )
        .catch(() => {});

      return NextResponse.json(
        { ok: false, error: "SELLO INVÁLIDO", traceId },
        { status: 403 }
      );
    }

    const { module, action } = await req.json();

    const whitelist: Record<string, string[]> = {
      kaerliana: ["status", "ingest", "analyze"],
      rafael: ["audit", "status", "seal"],
      orion: ["strategy"],
      arturo: ["build"],
    };

    if (!whitelist[module] || !whitelist[module].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "ACCIÓN NO PERMITIDA", traceId },
        { status: 403 }
      );
    }

    const log =
      JSON.stringify({
        traceId,
        timestamp: new Date().toISOString(),
        module,
        action,
        ok: true,
      }) + "\n";

    await fs.appendFile(logPath, log);

    return NextResponse.json({
      ok: true,
      text: `[${module.toUpperCase()}]: ${action} ejecutado.`,
      traceId,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "FALLO DE NÚCLEO", traceId },
      { status: 500 }
    );
  }
}
