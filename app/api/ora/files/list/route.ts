import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function safeResolve(inputPath: string) {
  const resolved = path.resolve(ROOT, inputPath || ".");
  if (!resolved.startsWith(ROOT)) {
    throw new Error("INVALID_PATH");
  }
  return resolved;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const target = body?.path || ".";

    const resolved = safeResolve(target);

    const items = fs.readdirSync(resolved, {
      withFileTypes: true,
    });

    const result = items.map((item) => ({
      name: item.name,
      type: item.isDirectory() ? "dir" : "file",
    }));

    return NextResponse.json({
      ok: true,
      path: target,
      items: result,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "LIST_FAILED",
      },
      { status: 500 }
    );
  }
}
