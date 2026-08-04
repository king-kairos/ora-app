import { NextResponse } from "next/server";
import { mockItems } from "@/pipeline-test/mockData";

export async function GET() {
  return NextResponse.json({
    ok: true,
    branch: "pipeline-test",
    status: "online",
    items: mockItems,
  });
}
