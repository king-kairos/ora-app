import { NextResponse } from "next/server";
import { mockItems } from "@/pollera/mockData";

export async function GET() {
  return NextResponse.json({
    ok: true,
    branch: "pollera",
    status: "online",
    items: mockItems,
  });
}
