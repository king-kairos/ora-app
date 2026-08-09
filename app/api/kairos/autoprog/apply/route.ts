export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  NextResponse,
} from "next/server";

import {
  getProposal,
} from "../../../../../src/ai/autoprog/patchStore";

import {
  authorizeKairosExecution,
} from "../../../../../src/security/kairosExecutionGate";

import {
  advanceStrategicPlanAfterAppliedProposal,
  generateReadyTaskProposals,
} from "@/kairos/strategic-planner/proposal-engine";

/**
 * KAIROS_DIRECT_APPLY_CANONICAL_ADAPTER_V1
 *
 * Esta ruta conserva el contrato histórico utilizado por:
 *
 * - Builder;
 * - execute-pipeline;
 * - consumidores de Kairos.
 *
 * Pero ya NO ejecuta applyPatch directamente.
 * Ya NO persiste status=applied localmente.
 *
 * La mutación real pertenece exclusivamente a:
 *
 *   POST /api/ora/autoprog/apply/:id
 *
 * El Strategic Cycle permanece aquí como responsabilidad
 * posterior a una aplicación canónica exitosa.
 */

const ORA_INTERNAL_BASE =
  String(
    process.env.ORA_INTERNAL_BASE_URL ||
      process.env.ORA_API_BASE_URL ||
      "http://127.0.0.1:3001"
  )
    .trim()
    .replace(/\/+$/, "");

async function safeJson(
  response: Response
) {
  const text =
    await response.text();

  try {
    return text
      ? JSON.parse(text)
      : {};
  } catch {
    return {
      raw: text,
    };
  }
}

export async function POST(
  req: Request
) {
  try {
    /*
     * Defensa en profundidad.
     *
     * El backend canónico volverá a exigir autorización,
     * pero esta entrada Kairos también permanece fail-closed.
     */
    const authorization =
      authorizeKairosExecution(
        req,
        "apply_patch"
      );

    if (!authorization.ok) {
      return NextResponse.json(
        {
          ok: false,
          action:
            authorization.action,
          error:
            authorization.error,
        },
        {
          status:
            authorization.status,
        }
      );
    }

    const body = await req
      .json()
      .catch(() => ({}));

    const id = String(
      body?.id || ""
    ).trim();

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "MISSING_PROPOSAL_ID",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * La proposal previa se conserva únicamente para metadata
     * del Strategic Planner.
     *
     * No se utiliza para ejecutar filesystem ni cambiar status.
     */
    const proposal =
      await getProposal(id);

    if (!proposal) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "PROPOSAL_NOT_FOUND",
          id,
        },
        {
          status: 404,
        }
      );
    }

    const seal = String(
      req.headers.get(
        "x-kairos-seal"
      ) ||
        req.headers.get(
          "kairos-seal"
        ) ||
        ""
    ).trim();

    /*
     * ÚNICA mutación real:
     *
     * Next adapter
     *       ->
     * backend ORA canónico
     *       ->
     * applyProposalById()
     *       ->
     * Execution Gate interno
     *       ->
     * applyPatch()
     */
    const canonicalResponse =
      await fetch(
        `${ORA_INTERNAL_BASE}/api/ora/autoprog/apply/${encodeURIComponent(
          id
        )}`,
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
          cache: "no-store",
        }
      );

    const canonicalData =
      await safeJson(
        canonicalResponse
      );

    if (
      !canonicalResponse.ok ||
      canonicalData?.ok === false
    ) {
      return NextResponse.json(
        {
          ...canonicalData,
          ok: false,
          compatibilityAdapter:
            true,
          canonicalEndpoint:
            "/api/ora/autoprog/apply/:id",
        },
        {
          status:
            canonicalResponse.status,
        }
      );
    }

    /*
     * STRATEGIC_CYCLE_AFTER_CANONICAL_APPLY_V1
     *
     * El Strategic Planner avanza solamente DESPUÉS
     * de que el backend ORA confirme el apply real.
     *
     * Nunca ejecuta automáticamente la siguiente proposal.
     */
    let strategicCycle: any = {
      linked: false,
      ok: true,
      message:
        "La propuesta no pertenece a un plan estratégico.",
    };

    try {
      const metadata: any =
        (proposal as any)?.metadata ||
        {};

      const planId = String(
        metadata?.planId || ""
      ).trim();

      const taskId =
        String(
          metadata?.taskId || ""
        ).trim() ||
        null;

      const isStrategicProposal =
        metadata?.mode ===
          "STRATEGIC_TASK_TO_PROPOSAL_V1" &&
        Boolean(planId);

      if (isStrategicProposal) {
        const advancedPlan =
          await advanceStrategicPlanAfterAppliedProposal(
            {
              planId,
              proposalId: id,
              taskId,
              operationId: null,
            }
          );

        const nextCycle =
          await generateReadyTaskProposals(
            planId
          );

        strategicCycle = {
          linked: true,
          ok: true,
          planId,
          taskId,
          planStatus:
            advancedPlan.status,
          createdCount:
            nextCycle.createdCount,
          created:
            nextCycle.created,
          skipped:
            nextCycle.skipped,
          message:
            nextCycle.createdCount > 0
              ? "Tarea completada y siguiente propuesta estratégica creada."
              : "Tarea completada. No había otra propuesta ejecutable en este ciclo.",
        };
      }
    } catch (
      strategicError: any
    ) {
      strategicCycle = {
        linked: true,
        ok: false,
        error:
          strategicError?.message ||
          "STRATEGIC_CYCLE_ADVANCE_FAILED",
        message:
          "La propuesta fue aplicada canónicamente, pero el avance del plan deberá revisarse.",
      };
    }

    return NextResponse.json({
      ok: true,
      compatibilityAdapter:
        true,
      canonicalEndpoint:
        "/api/ora/autoprog/apply/:id",
      strategicCycle,
      applied:
        canonicalData?.applied ||
        null,
      /*
       * Se conserva el campo por compatibilidad histórica.
       * El backend canónico devuelve los resultados reales
       * dentro de applied.
       */
      plan:
        canonicalData?.applied?.plan ||
        null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "KAIROS_DIRECT_APPLY_ADAPTER_FAILED",
      },
      {
        status: 500,
      }
    );
  }
}
