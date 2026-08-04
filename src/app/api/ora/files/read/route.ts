import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function safeResolve(inputPath: string) {
  const resolved = path.resolve(ROOT, inputPath);

  if (!resolved.startsWith(ROOT)) {
    throw new Error("INVALID_PATH");
  }

  return resolved;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const target = String(body?.file || "").trim();

    if (!target) {
      return NextResponse.json(
        {
          ok: false,
          error: "FILE_REQUIRED",
        },
        { status: 400 }
      );
    }

    const resolved = safeResolve(target);

    if (!fs.existsSync(resolved)) {
      return NextResponse.json(
        {
          ok: false,
          error: "FILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const stat = fs.statSync(resolved);

    if (!stat.isFile()) {
      return NextResponse.json(
        {
          ok: false,
          error: "NOT_A_FILE",
        },
        { status: 400 }
      );
    }

    const content = fs.readFileSync(resolved, "utf8");

    return NextResponse.json({
      ok: true,
      file: target,
      size: stat.size,
      content,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "READ_FAILED",
      },
      { status: 500 }
    );
  }
}
