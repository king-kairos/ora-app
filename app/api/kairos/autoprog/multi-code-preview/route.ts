export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generateMultiFileCode } from "../../../../../src/ai/autoprog/multiFileCodeGenerator";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const intent = String(body?.intent || "").trim();
    const branch = String(body?.branch || "").trim();
    const essence = String(body?.essence || "").trim();

    if (!intent) {
      return NextResponse.json(
        { ok: false, error: "MISSING_INTENT" },
        { status: 400 }
      );
    }

    return NextResponse.json(generateMultiFileCode({ intent, branch, essence }));
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "MULTI_CODE_PREVIEW_FAIL" },
      { status: 500 }
    );
  }
}
