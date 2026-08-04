export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runSupervisor } from "../../../../src/ai/autoprog/supervisor-engine";

const guardian = require("../../../../ai/autoprog/guardian");
const memory = require("../../../../ai/memory/evolution-memory");

export async function GET() {
  try {

    const result: any = await runSupervisor();

    // Si el supervisor trae un patch propuesto
    if (result && result.patch) {

      const validation = guardian.validatePatch(result.patch);

      if (!validation.allowed) {

        memory.recordEvent({
          type: "guardian-block",
          reason: validation.reason,
          patch: result.patch,
          timestamp: Date.now()
        });

        return NextResponse.json({
          ok: false,
          blocked: true,
          reason: validation.reason
        });

      }

      memory.recordEvent({
        type: "guardian-pass",
        patch: result.patch,
        timestamp: Date.now()
      });

    }

    return NextResponse.json(result);

  } catch (error) {

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Fallo interno en supervisor"
      },
      { status: 500 }
    );

  }
}
