export const runtime = "nodejs";

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const FILE_PATH = path.join(process.cwd(), "data", "site", "home-config.json");

const DEFAULT_CONFIG = {
  welcomeTitle: "Bienvenido a ORA",
  welcomeText:
    "Centro soberano en construcción viva.",
  heroImageUrl: "",
  heroVideoUrl: "",
  updatedAt: new Date().toISOString(),
};

function ensureFile() {
  const dir = path.dirname(FILE_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
  }
}

function readConfig() {
  ensureFile();

  try {
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_CONFIG,
      ...(parsed && typeof parsed === "object" ? parsed : {}),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function GET() {
  try {
    const config = readConfig();

    return NextResponse.json({
      ok: true,
      config,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "HOME_CONFIG_READ_FAIL",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const seal = String(
      req.headers.get("x-kairos-seal") ||
        req.headers.get("X-KAIROS-SEAL") ||
        ""
    ).trim();

    const expectedSeal = String(process.env.KAIROS_SEAL || "").trim();

    if (!expectedSeal) {
      return NextResponse.json(
        {
          ok: false,
          error: "KAIROS_SEAL_MISSING_ON_SERVER",
        },
        { status: 500 }
      );
    }

    if (!seal || seal !== expectedSeal) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_KAIROS_SEAL",
        },
        { status: 403 }
      );
    }

    const nextConfig = {
      welcomeTitle: String(body?.welcomeTitle || "").trim() || DEFAULT_CONFIG.welcomeTitle,
      welcomeText: String(body?.welcomeText || "").trim() || DEFAULT_CONFIG.welcomeText,
      heroImageUrl: String(body?.heroImageUrl || "").trim(),
      heroVideoUrl: String(body?.heroVideoUrl || "").trim(),
      updatedAt: new Date().toISOString(),
    };

    ensureFile();
    fs.writeFileSync(FILE_PATH, JSON.stringify(nextConfig, null, 2), "utf8");

    return NextResponse.json({
      ok: true,
      message: "HOME_CONFIG_UPDATED",
      config: nextConfig,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "HOME_CONFIG_WRITE_FAIL",
      },
      { status: 500 }
    );
  }
}
