export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import {
  completeStrategicPlanAfterVerification,
} from "@/kairos/strategic-planner/proposal-engine";

function clean(value: unknown) {
  return String(value || "").trim();
}

function hasValidSeal(req: Request) {
  const expected = clean(process.env.KAIROS_SEAL);

  if (!expected) return false;

  const received = clean(
    req.headers.get("x-kairos-seal") ||
      req.headers.get("kairos-seal")
  );

  return received === expected;
}

function passed(value: unknown) {
  return value === true;
}

export async function POST(req: Request) {
  try {
    if (!hasValidSeal(req)) {
      return NextResponse.json(
        {
          ok: false,
          error: "SELLO_INVALIDO",
        },
        {
          status: 403,
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const planId = clean(body?.planId);

    if (!planId) {
      return NextResponse.json(
        {
          ok: false,
          error: "PLAN_ID_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await completeStrategicPlanAfterVerification({
        planId,
        operationId:
          clean(body?.operationId) || null,
        message:
          clean(body?.message) || null,
        checks: {
          typescript: passed(body?.checks?.typescript),
          build: passed(body?.checks?.build),
          pm2: passed(body?.checks?.pm2),
          publicRoute: passed(
            body?.checks?.publicRoute
          ),
          apiRoute: passed(body?.checks?.apiRoute),
        },
      });

    return NextResponse.json(result);
  } catch (error: any) {
    const message =
      error?.message ||
      "FINAL_VERIFICATION_ENGINE_FAILED";

    const status =
      message === "STRATEGIC_PLAN_NOT_FOUND"
        ? 404
        : message.startsWith(
            "FINAL_VERIFICATION_FAILED"
          ) ||
          message.startsWith(
            "IMPLEMENTATION_TASKS_INCOMPLETE"
          ) ||
          message.startsWith(
            "VERIFICATION_TASK_NOT_READY"
          )
        ? 409
        : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status,
      }
    );
  }
}
