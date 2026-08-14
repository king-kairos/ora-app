export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * KAIROS_LEGACY_BRANCH_MUTATOR_RETIRED_V1
 *
 * Esta ruta histórica ya NO crea ramas, clones,
 * carpetas ni registries directamente.
 *
 * La creación estructural debe entrar por ORA Core:
 *
 *   intención
 *     -> proposal
 *     -> aprobación Kairos
 *     -> apply canónico
 *     -> registry materializado
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    {
      ok: false,
      error: "DIRECT_BRANCH_MUTATION_RETIRED",
      message:
        "La creación directa de ramas fue retirada. Usa el flujo soberano proposal-first de ORA Core.",
      materializationAuthority: "canonical-apply",
      canonicalEndpoint: "/api/ora/autoprog/branches/create",
    },
    { status: 409 }
  );
}
