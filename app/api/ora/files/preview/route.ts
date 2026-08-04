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

    const file = String(body?.file || "").trim();
    const find = String(body?.find || "");
    const replace = String(body?.replace || "");

    if (!file || !find) {
      return NextResponse.json(
        {
          ok: false,
          error: "FILE_AND_FIND_REQUIRED",
        },
        { status: 400 }
      );
    }

    const resolved = safeResolve(file);

    if (!fs.existsSync(resolved)) {
      return NextResponse.json(
        {
          ok: false,
          error: "FILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const original = fs.readFileSync(resolved, "utf8");

    if (!original.includes(find)) {
      return NextResponse.json(
        {
          ok: false,
          error: "TEXT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const updated = original.replace(find, replace);

    return NextResponse.json({
      ok: true,
      file,
      changed: original !== updated,
      preview: {
        before: find,
        after: replace,
      },
      diffBytes:
        Buffer.byteLength(updated, "utf8") -
        Buffer.byteLength(original, "utf8"),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "PREVIEW_FAILED",
      },
      { status: 500 }
    );
  }
}
