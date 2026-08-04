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
    const content = String(body?.content || "");
    const overwrite = Boolean(body?.overwrite);

    if (!file) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_FILE",
        },
        { status: 400 }
      );
    }

    const resolved = safeResolve(file);

    if (fs.existsSync(resolved) && !overwrite) {
      return NextResponse.json(
        {
          ok: false,
          error: "FILE_ALREADY_EXISTS",
        },
        { status: 400 }
      );
    }

    fs.mkdirSync(path.dirname(resolved), {
      recursive: true,
    });

    fs.writeFileSync(resolved, content, "utf8");

    return NextResponse.json({
      ok: true,
      created: true,
      file,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "CREATE_FAILED",
      },
      { status: 500 }
    );
  }
}
