export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { execFileSync } from "child_process";

function validSeal(req: Request) {
  const expected = String(process.env.KAIROS_SEAL || "").trim();

  if (!expected) return true;

  const received = String(
    req.headers.get("x-kairos-seal") || ""
  ).trim();

  return received === expected;
}

function pm2Status(name: string) {
  try {
    const raw = execFileSync(
      "pm2",
      ["jlist"],
      {
        encoding: "utf8",
        timeout: 10000,
        maxBuffer: 4 * 1024 * 1024,
      }
    );

    const processes = JSON.parse(raw);

    const process = processes.find(
      (item: any) => item?.name === name
    );

    return {
      name,
      found: Boolean(process),
      status:
        process?.pm2_env?.status || "unknown",
      online:
        process?.pm2_env?.status === "online",
      pid: process?.pid || null,
      restarts:
        process?.pm2_env?.restart_time || 0,
    };
  } catch (error: any) {
    return {
      name,
      found: false,
      status: "error",
      online: false,
      pid: null,
      restarts: 0,
      error:
        error?.message || "PM2_STATUS_FAILED",
    };
  }
}

export async function GET(req: Request) {
  if (!validSeal(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: "SELLO_INVALIDO",
      },
      {
        status: 403,
      }
    );
  }

  const ora = pm2Status("ora");
  const oraFront = pm2Status("ora-front");
  const webrtcGateway = pm2Status(
    "webrtc-gateway"
  );

  const allOnline =
    ora.online &&
    oraFront.online &&
    webrtcGateway.online;

  return NextResponse.json(
    {
      ok: allOnline,
      mode: "KAIROS_STATUS_ENGINE",
      sealRequired: Boolean(
        String(
          process.env.KAIROS_SEAL || ""
        ).trim()
      ),
      services: {
        ora,
        oraFront,
        webrtcGateway,
      },
      checkedAt: new Date().toISOString(),
      message: allOnline
        ? "Kairos y servicios principales están operativos."
        : "Uno o más servicios no están online.",
    },
    {
      status: allOnline ? 200 : 503,
    }
  );
}
