export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readModuleRegistry } from "../../../../src/ai/autoprog/module-registry";

export async function GET() {
  try {
    const items = readModuleRegistry();

    return NextResponse.json({
      ok: true,
      total: items.length,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Fallo leyendo module registry",
      },
      { status: 500 }
    );
  }
}
