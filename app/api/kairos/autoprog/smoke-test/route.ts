export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const run = promisify(exec);

function hasValidSeal(req: Request) {
  const expected = String(process.env.KAIROS_SEAL || "").trim();
  if (!expected) return false;
  const received = String(req.headers.get("x-kairos-seal") || "").trim();
  return received === expected;
}

async function curlCheck(name: string, url: string) {
  try {
    const { stdout } = await run(
      `curl -k -s -o /dev/null -w "%{http_code}" "${url}"`,
      { timeout: 15000 }
    );

    const code = Number(String(stdout).trim());

    return {
      name,
      url,
      ok: code >= 200 && code < 400,
      status: code,
    };
  } catch (error: any) {
    return {
      name,
      url,
      ok: false,
      error: error?.message || "CURL_FAIL",
    };
  }
}

async function jsonCheck(name: string, url: string) {
  try {
    const { stdout } = await run(`curl -k -s "${url}"`, { timeout: 15000 });
    const data = JSON.parse(stdout);

    return {
      name,
      url,
      ok: data?.ok === true,
      data,
    };
  } catch (error: any) {
    return {
      name,
      url,
      ok: false,
      error: error?.message || "JSON_CHECK_FAIL",
    };
  }
}

async function pm2Check() {
  try {
    const { stdout } = await run("pm2 jlist", { timeout: 15000 });
    const list = JSON.parse(stdout);

    const required = ["ora", "ora-front"];
    const services = required.map((name) => {
      const found = list.find((x: any) => x?.name === name);
      return {
        name,
        ok: found?.pm2_env?.status === "online",
        status: found?.pm2_env?.status || "missing",
      };
    });

    return {
      name: "pm2",
      ok: services.every((s) => s.ok),
      services,
    };
  } catch (error: any) {
    return {
      name: "pm2",
      ok: false,
      error: error?.message || "PM2_CHECK_FAIL",
    };
  }
}

export async function POST(req: Request) {
  try {
    if (!hasValidSeal(req)) {
      return NextResponse.json(
        { ok: false, error: "SELLO_INVALIDO" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const branch = String(body?.branch || "").trim();

    if (!branch) {
      return NextResponse.json(
        { ok: false, error: "MISSING_BRANCH" },
        { status: 400 }
      );
    }

    const pageUrl = `https://orareal.com/${branch}`;
    const apiUrl = `https://orareal.com/api/${branch}/state`;

    const checks = [
      await curlCheck("page", pageUrl),
      await jsonCheck("api", apiUrl),
      await pm2Check(),
    ];

    const ok = checks.every((x) => x.ok);

    return NextResponse.json({
      ok,
      mode: "SMOKE_TEST_ENGINE",
      branch,
      checks,
      message: ok
        ? "Smoke test exitoso. Página, API y PM2 están operativos."
        : "Smoke test falló. Revisar checks antes de publicar.",
      testedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "SMOKE_TEST_FAIL" },
      { status: 500 }
    );
  }
}
