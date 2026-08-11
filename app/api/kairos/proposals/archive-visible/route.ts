export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

function getCoreBase() {
  const envBase =
    process.env.ORA_API_BASE_URL ||
    process.env.ORA_INTERNAL_BASE_URL ||
    process.env.INTERNAL_BASE_URL ||
    "";

  return envBase
    ? envBase.replace(/\/+$/, "")
    : "http://127.0.0.1:3001";
}

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export async function POST(req: Request) {
  try {
    const seal = String(
      req.headers.get("x-kairos-seal") || ""
    ).trim();

    if (!seal) {
      return NextResponse.json(
        {
          ok: false,
          error: "KAIROS_SEAL_REQUIRED",
        },
        { status: 403 }
      );
    }

    /*
     * La lista visible sigue viniendo del agregador usado
     * por KairosBuilderPanel.
     *
     * Esta ruta NO modifica ningún store directamente.
     */
    const origin = new URL(req.url).origin;

    const listRes = await fetch(
      `${origin}/api/ora/patches/list`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-kairos-seal": seal,
        },
        cache: "no-store",
      }
    );

    const listData = await readJsonSafe(listRes);

    if (!listRes.ok || listData?.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          error:
            listData?.error ||
            "VISIBLE_PROPOSAL_LIST_FAILED",
        },
        { status: listRes.status || 500 }
      );
    }

    const items =
      Array.isArray(listData?.items)
        ? listData.items
        : Array.isArray(listData?.patches)
        ? listData.patches
        : Array.isArray(listData?.data)
        ? listData.data
        : Array.isArray(listData)
        ? listData
        : [];

    const visible = items.filter((p: any) => {
      const status = String(
        p?.status || "unknown"
      )
        .trim()
        .toLowerCase();

      return (
        status !== "archived" &&
        p?.archived !== true
      );
    });

    const ids: string[] = Array.from(
      new Set<string>(
        visible
          .map((p: any) =>
            String(p?.id || "").trim()
          )
          .filter((id: string) => id.length > 0)
      )
    );

    const results: any[] = [];

    /*
     * Cada transición pasa individualmente por el Core.
     * El Core vuelve a exigir Sello Kairos y valida
     * la transición de estado canónica.
     */
    for (const id of ids) {
      const res = await fetch(
        `${getCoreBase()}/api/ora/autoprog/archive/${encodeURIComponent(id)}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
            "x-kairos-seal":
              seal,
          },
          body:
            JSON.stringify({}),
          cache:
            "no-store",
        }
      );

      const data =
        await readJsonSafe(res);

      results.push({
        id,
        ok:
          res.ok &&
          data?.ok !== false,
        status:
          res.status,
        error:
          res.ok
            ? null
            : data?.error ||
              `HTTP_${res.status}`,
      });
    }

    const archived =
      results.filter(
        (x) => x.ok
      ).length;

    const failed =
      results.filter(
        (x) => !x.ok
      );

    return NextResponse.json(
      {
        ok:
          failed.length === 0,
        mode:
          "ARCHIVE_VISIBLE_CANONICAL_ORCHESTRATOR_V1",
        requested:
          ids.length,
        totalArchived:
          archived,
        failedCount:
          failed.length,
        failed,
        directStoreMutation:
          false,
        canonicalEndpoint:
          "/api/ora/autoprog/archive/:id",
      },
      {
        status:
          failed.length === 0
            ? 200
            : 207,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "ARCHIVE_VISIBLE_CANONICAL_FAIL",
      },
      { status: 500 }
    );
  }
}
