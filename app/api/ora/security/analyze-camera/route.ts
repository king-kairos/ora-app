import { NextRequest, NextResponse } from "next/server";
import {
  analyzeSecurityCamera,
  analyzeAllSecurityCameras,
} from "@/ora/security/cameraObserver";

export async function GET() {
  return NextResponse.json(analyzeAllSecurityCameras());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.cameraId) {
      return NextResponse.json(
        {
          ok: false,
          error: "cameraId_required",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      analyzeSecurityCamera(body.cameraId)
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
