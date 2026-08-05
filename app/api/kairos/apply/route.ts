export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/**
 * KAIROS_APPLY_LEGACY_RETIRED
 *
 * Esta ruta antigua escribía archivos, ejecutaba build y reiniciaba
 * procesos directamente. Fue retirada porque duplicaba los motores
 * modernos y no utilizaba la puerta soberana central.
 *
 * Aplicación autorizada:
 * - /api/kairos/autoprog/apply
 *
 * Pipeline completo autorizado:
 * - /api/kairos/autoprog/execute-pipeline
 * - /api/kairos/autonomous-cycle
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      retired: true,
      mode: "KAIROS_APPLY_LEGACY_RETIRED",
      error: "LEGACY_EXECUTION_ROUTE_RETIRED",
      message:
        "Esta ruta fue retirada. Use el flujo moderno protegido por la Puerta Kairos.",
      replacements: {
        apply: "/api/kairos/autoprog/apply",
        pipeline:
          "/api/kairos/autoprog/execute-pipeline",
        autonomousCycle:
          "/api/kairos/autonomous-cycle",
      },
      sovereignty: {
        directFilesystemMutation: false,
        directBuild: false,
        directRestart: false,
        kairosGateRequiredOnReplacement: true,
      },
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
