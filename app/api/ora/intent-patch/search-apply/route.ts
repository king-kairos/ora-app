export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextRequest,
} from "next/server";

import {
  runSimpleIntentPatch,
} from "../../../../../src/ai/autoprog/simpleIntentPatchEngine";

export async function POST(
  req: NextRequest
) {
  return runSimpleIntentPatch(
    req,
    "search-first"
  );
}
