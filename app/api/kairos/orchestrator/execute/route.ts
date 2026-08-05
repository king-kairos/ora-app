export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import {
  readOperation,
  updateOperation,
} from "@/kairos/orchestrator/engine";

import {
  getProposal,
  setStatus,
} from "@/ai/autoprog/patchStore";

import { applyPatch } from "@/ai/autoprog/applyPatch";
import { authorizeKairosExecution } from "@/security/kairosExecutionGate";

import {
  advanceStrategicPlanAfterAppliedProposal,
  generateReadyTaskProposals,
} from "@/kairos/strategic-planner/proposal-engine";

const ROOT = process.cwd();
const LOCAL_BASE_URL = "http://127.0.0.1:3000";

const BLOCKED_EXACT = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "middleware.ts",
  "src/app.ts",
  "app/kairos/page.tsx",
]);

const BLOCKED_PREFIXES = [
  ".git/",
  ".next/",
  "node_modules/",
  "ora-backups/",
  "src/ai/core/",
  "src/ai/security/",
  "app/kairos/",
  "app/api/kairos/orchestrator/",
];

function normalizeSeal(value: string | null) {
  return String(value || "").trim();
}

function normalizeRelativePath(input: unknown) {
  return String(input || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^\.\//, "");
}

function isInsideRoot(relative: string) {
  const absolute = path.resolve(ROOT, relative);
  const rel = path.relative(ROOT, absolute);

  return (
    rel !== "" &&
    !rel.startsWith("..") &&
    !path.isAbsolute(rel)
  );
}

function assertSafeTarget(relativeInput: string) {
  const relative = normalizeRelativePath(
    relativeInput
  );

  if (!relative) {
    throw new Error("EMPTY_TARGET_PATH");
  }

  if (!isInsideRoot(relative)) {
    throw new Error(
      `TARGET_OUTSIDE_ROOT:${relative}`
    );
  }

  const lower = relative.toLowerCase();

  if (
    BLOCKED_EXACT.has(lower) ||
    BLOCKED_PREFIXES.some((prefix) =>
      lower.startsWith(prefix.toLowerCase())
    )
  ) {
    throw new Error(
      `PROTECTED_PATH_BLOCKED:${relative}`
    );
  }

  if (
    !relative.startsWith("app/") &&
    !relative.startsWith("src/") &&
    !relative.startsWith("public/") &&
    !relative.startsWith("data/")
  ) {
    throw new Error(
      `TARGET_PREFIX_NOT_ALLOWED:${relative}`
    );
  }

  return relative;
}

async function pathExists(relative: string) {
  try {
    await fs.stat(path.resolve(ROOT, relative));
    return true;
  } catch {
    return false;
  }
}

async function readJsonResponse(
  response: Response
) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      raw: text,
    };
  }
}

async function failOperation(
  operationId: string,
  error: unknown
) {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  await updateOperation(
    operationId,
    "failed",
    "failed",
    message
  );

  return message;
}

export async function POST(req: Request) {
  let operationId = "";

  try {
    const authorization = authorizeKairosExecution(
      req,
      "apply_patch"
    );

    if (!authorization.ok) {
      return NextResponse.json(
        {
          ok: false,
          action: authorization.action,
          error: authorization.error,
        },
        {
          status: authorization.status,
        }
      );
    }

    const body = await req
      .json()
      .catch(() => ({}));

    operationId = String(
      body?.operationId || ""
    ).trim();

    if (!operationId) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPERATION_ID_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    const operation = await readOperation(
      operationId
    );

    if (!operation) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPERATION_NOT_FOUND",
          operationId,
        },
        {
          status: 404,
        }
      );
    }

    if (
      operation.status === "completed" ||
      operation.stage === "applied"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPERATION_ALREADY_COMPLETED",
          operation,
        },
        {
          status: 409,
        }
      );
    }

    await updateOperation(
      operationId,
      "validating",
      "running",
      "Validando propuesta, estado y rutas objetivo."
    );

    let proposal = await getProposal(
      operation.proposalId
    );

    if (!proposal) {
      throw new Error(
        `PROPOSAL_NOT_FOUND:${operation.proposalId}`
      );
    }

    const proposalStatus = String(
      proposal.status || "pending"
    )
      .trim()
      .toLowerCase();

    if (
      proposalStatus === "applied" ||
      proposalStatus === "published"
    ) {
      throw new Error(
        `PROPOSAL_ALREADY_${proposalStatus.toUpperCase()}`
      );
    }

    if (
      proposalStatus !== "pending" &&
      proposalStatus !== "approved"
    ) {
      throw new Error(
        `PROPOSAL_STATUS_NOT_EXECUTABLE:${proposalStatus}`
      );
    }

    const rawTargets =
      Array.isArray(proposal.targetFiles) &&
      proposal.targetFiles.length > 0
        ? proposal.targetFiles
        : Array.isArray(proposal.files)
        ? proposal.files.map(
            (file) => file.path
          )
        : [];

    const targetPaths = Array.from(
      new Set(
        rawTargets
          .map(assertSafeTarget)
          .filter(Boolean)
      )
    );

    if (targetPaths.length === 0) {
      throw new Error(
        "PROPOSAL_TARGET_FILES_REQUIRED"
      );
    }

    /*
      Una llamada sellada a este endpoint representa
      la autorización soberana para ejecutar esta
      operación concreta.
    */
    if (proposalStatus === "pending") {
      await updateOperation(
        operationId,
        "approving",
        "running",
        "Aprobando propuesta bajo Sello de Kairos."
      );

      await setStatus(
        operation.proposalId,
        "approved"
      );

      await updateOperation(
        operationId,
        "approved",
        "running",
        "Propuesta aprobada bajo Sello de Kairos."
      );
    } else {
      await updateOperation(
        operationId,
        "approved",
        "running",
        "La propuesta ya estaba aprobada."
      );
    }

    proposal = await getProposal(
      operation.proposalId
    );

    if (!proposal) {
      throw new Error(
        "PROPOSAL_DISAPPEARED_AFTER_APPROVAL"
      );
    }

    const existingPaths: string[] = [];

    for (const target of targetPaths) {
      if (await pathExists(target)) {
        existingPaths.push(target);
      }
    }

    let backup: any = null;

    if (existingPaths.length > 0) {
      await updateOperation(
        operationId,
        "backing_up",
        "running",
        `Creando backup selectivo de ${existingPaths.length} target(s) existente(s).`
      );

      const seal = normalizeSeal(
        req.headers.get("x-kairos-seal")
      );

      const backupResponse = await fetch(
        `${LOCAL_BASE_URL}/api/ora/system/backup`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            "x-kairos-seal": seal,
          },
          body: JSON.stringify({
            proposalId:
              operation.proposalId,
            branch:
              body?.branch || null,
            source:
              "kairos-orchestrator-phase-2",
            includePaths:
              existingPaths,
            excludePaths: [
              ".next",
              "node_modules",
              "ora-backups",
              "app/build",
            ],
          }),
          cache: "no-store",
        }
      );

      backup = await readJsonResponse(
        backupResponse
      );

      if (
        !backupResponse.ok ||
        backup?.ok === false
      ) {
        throw new Error(
          backup?.error ||
            backup?.message ||
            `BACKUP_HTTP_${backupResponse.status}`
        );
      }

      await updateOperation(
        operationId,
        "backup_ready",
        "running",
        `Backup selectivo listo: ${
          backup?.backupRoot || "OK"
        }`
      );
    } else {
      await updateOperation(
        operationId,
        "backup_not_required",
        "running",
        "Todos los targets serán creados; no existe estado previo que respaldar."
      );
    }

    await updateOperation(
      operationId,
      "applying",
      "running",
      "Aplicando propuesta autorizada."
    );

    const applyResult = await applyPatch(
      proposal
    );

    await setStatus(
      operation.proposalId,
      "applied"
    );

    /*
     * STRATEGIC_CYCLE_AFTER_APPLY_V1
     *
     * Una propuesta estratégica aplicada completa su tarea,
     * desbloquea dependencias y genera automáticamente
     * la siguiente propuesta lista. Nunca aplica la siguiente
     * propuesta sin una nueva aprobación soberana.
     */
    let strategicCycle: any = {
      linked: false,
      ok: true,
      message:
        "La propuesta no pertenece a un plan estratégico.",
    };

    try {
      const metadata: any =
        (proposal as any)?.metadata || {};

      const planId = String(
        metadata?.planId || ""
      ).trim();

      const taskId =
        String(metadata?.taskId || "").trim() ||
        null;

      const isStrategicProposal =
        metadata?.mode ===
          "STRATEGIC_TASK_TO_PROPOSAL_V1" &&
        Boolean(planId);

      if (isStrategicProposal) {
        const advancedPlan =
          await advanceStrategicPlanAfterAppliedProposal({
            planId,
            proposalId:
              operation.proposalId,
            taskId,
            operationId,
          });

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
    } catch (strategicError: any) {
      strategicCycle = {
        linked: true,
        ok: false,
        error:
          strategicError?.message ||
          "STRATEGIC_CYCLE_ADVANCE_FAILED",
        message:
          "La propuesta fue aplicada, pero el avance del plan deberá revisarse.",
      };
    }

    const finalOperation =
      await updateOperation(
        operationId,
        "applied",
        "completed",
        `Propuesta aplicada. Archivos procesados: ${applyResult.results.length}.`
      );

    return NextResponse.json({
      ok: true,
      mode:
        "KAIROS_ORCHESTRATOR_PHASE_2",
      operationId,
      proposalId:
        operation.proposalId,
      stage: "applied",
      status: "completed",
      targets: targetPaths,
      existingTargetsBackedUp:
        existingPaths,
      backup,
      apply: {
        ok: applyResult.ok,
        results: applyResult.results,
        plan: applyResult.plan,
      },
      strategicCycle,
      operation: finalOperation,
      message:
        strategicCycle?.linked
          ? "Fase 2 completada y ciclo estratégico actualizado."
          : "Fase 2 completada: validación, aprobación, backup selectivo y aplicación.",
    });
  } catch (error: any) {
    const message = operationId
      ? await failOperation(
          operationId,
          error
        )
      : error?.message ||
        "ORCHESTRATOR_PHASE_2_FAILED";

    return NextResponse.json(
      {
        ok: false,
        mode:
          "KAIROS_ORCHESTRATOR_PHASE_2_FAILED",
        operationId:
          operationId || null,
        error: message,
      },
      {
        status: 409,
      }
    );
  }
}
