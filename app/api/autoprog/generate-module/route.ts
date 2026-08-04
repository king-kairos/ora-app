export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generateModuleTemplate } from "../../../../src/ai/autoprog/module-generator-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await generateModuleTemplate({
      moduleName: String(body?.moduleName || ""),
      title: body?.title ? String(body.title) : undefined,
      description: body?.description ? String(body.description) : undefined,
    });

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Fallo generando módulo",
      },
      { status: 500 }
    );
  }
}
