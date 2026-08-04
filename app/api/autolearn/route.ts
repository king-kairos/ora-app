import { NextResponse } from "next/server";
import { createAutoProposal } from "../../../src/autoprog/autolearn";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const moduleName = body?.moduleName;

    const validModules = ["rafael", "kaerliana", "orion", "arturo"];

    if (!validModules.includes(moduleName)) {
      return NextResponse.json(
        {
          ok: false,
          message: "moduleName inválido. Usa: rafael, kaerliana, orion, arturo",
        },
        { status: 400 }
      );
    }

    const result = createAutoProposal(moduleName);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
