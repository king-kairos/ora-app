export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

function getCoreBase(req: Request) {
  const envBase =
    process.env.ORA_API_BASE_URL ||
    process.env.ORA_INTERNAL_BASE_URL ||
    process.env.INTERNAL_BASE_URL ||
    "";

  if (envBase) {
    return envBase.replace(/\/+$/, "");
  }

  const url = new URL(req.url);

  if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
    return "http://127.0.0.1:3001";
  }

  return "http://127.0.0.1:3001";
}

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = String(rawId || "").trim().replace(/\.json$/i, "");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "MISSING_ID" },
        { status: 400 }
      );
    }

    const seal = String(
      req.headers.get("x-kairos-seal") || ""
    ).trim();

    const res = await fetch(
      `${getCoreBase(req)}/api/ora/autoprog/proposal/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(seal ? { "x-kairos-seal": seal } : {}),
        },
        cache: "no-store",
      }
    );

    const data = await readJsonSafe(res);

    return NextResponse.json(
      {
        ...data,
        mode:
          data?.mode ||
          "PROPOSAL_REVIEW_DETAIL_CANONICAL_ADAPTER",
      },
      { status: res.status }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "PROPOSAL_REVIEW_ADAPTER_FAIL",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = String(rawId || "").trim().replace(/\.json$/i, "");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "MISSING_ID" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim().toLowerCase();

    if (action !== "archive") {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_ACTION",
          allowed: ["archive"],
        },
        { status: 400 }
      );
    }

    const seal = String(
      req.headers.get("x-kairos-seal") || ""
    ).trim();

    const res = await fetch(
      `${getCoreBase(req)}/api/ora/autoprog/archive/${encodeURIComponent(id)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(seal ? { "x-kairos-seal": seal } : {}),
        },
        body: JSON.stringify({}),
        cache: "no-store",
      }
    );

    const data = await readJsonSafe(res);

    return NextResponse.json(
      {
        ...data,
        mode:
          data?.mode ||
          "PROPOSAL_ARCHIVE_CANONICAL_ADAPTER",
        proposalId:
          data?.proposalId ||
          id,
      },
      { status: res.status }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "PROPOSAL_ARCHIVE_ADAPTER_FAIL",
      },
      { status: 500 }
    );
  }
}
