export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { loadModules } from "../../../../src/ai/core/module-loader";

export async function GET() {
  try {

    const modules = loadModules();

    return NextResponse.json({
      ok: true,
      modules
    });

  } catch (error) {

    return NextResponse.json({
      ok: false,
      modules: []
    });

  }
}
