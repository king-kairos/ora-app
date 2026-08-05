export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runMultiIntentPatch,
} from "../../../../../src/ai/autoprog/multiIntentPatchEngine";

export async function POST(
  req: NextRequest
) {
  const result =
    await runMultiIntentPatch(
      req,
      "multi-context"
    );

  return NextResponse.json(
    result.body,
    {
      status: result.status,
    }
  );
}
