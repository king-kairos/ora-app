import { NextResponse } from "next/server";
import { applyProposalPatch } from "../../../src/autoprog/applyPatch";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let proposalId = "";

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      proposalId = String(body?.proposalId || "").trim();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await req.formData();
      proposalId = String(formData.get("proposalId") || "").trim();
    }

    if (!proposalId) {
      return NextResponse.json(
        { ok: false, message: "proposalId es requerido" },
        { status: 400 }
      );
    }

    const result = await Promise.resolve(applyProposalPatch(proposalId));

    if (contentType.includes("application/json")) {
      return NextResponse.json(result, {
        status: result?.ok ? 200 : 400,
      });
    }

    return new NextResponse(null, {
      status: 303,
      headers: {
        Location: "/kairos",
      },
    });
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
