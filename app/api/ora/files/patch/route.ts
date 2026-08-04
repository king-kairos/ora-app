import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const file = String(body.file || "").trim();
    const find = String(body.find || "");
    const replace = String(body.replace || "");

    if (!file) {
      return NextResponse.json(
        {
          ok: false,
          error: "FILE_REQUIRED",
        },
        { status: 400 }
      );
    }

    const fullPath = path.join(process.cwd(), file);

    const original = await fs.readFile(fullPath, "utf8");

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

    await fs.writeFile(fullPath, updated, "utf8");

    return NextResponse.json({
      ok: true,
      message: "Patch aplicado.",
      file,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "PATCH_FAILED",
      },
      { status: 500 }
    );
  }
}
