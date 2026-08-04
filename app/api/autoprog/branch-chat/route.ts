export const runtime = "nodejs";

import { NextResponse } from "next/server";

const { branchChat } = require("../../../../ai/autoprog/branch-chat-engine");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug = String(body?.slug || "").trim();
    const text = String(body?.text || "").trim();

    if (!slug || !text) {
      return NextResponse.json(
        { ok: false, error: "Faltan slug o text" },
        { status: 400 }
      );
    }

    const result = branchChat({ slug, text });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "BRANCH_CHAT_FAIL",
      },
      { status: 500 }
    );
  }
}
