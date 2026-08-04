import { runObservatoryScan } from "./observatory-engine";
import { createProposal } from "./proposal-engine";

export async function detectImprovements() {
  const report = await runObservatoryScan();
  const created: any[] = [];

  if (report.warnings.length > 0) {
    const proposal = await createProposal({
      title: "Observatorio detecta advertencias del sistema",
      summary: report.warnings.join(" | "),
      type: "improvement",
      risk: "medium",
      reason:
        "El observatorio detectó advertencias estructurales que deben revisarse.",
      proposedBy: "orion",
      source: "scan",
      tags: ["observatory", "warning", "autoprog"],
      files: [],
    });

    created.push(proposal);
  }

  if (report.stats.autoprogModulesCount < 12) {
    const proposal = await createProposal({
      title: "Observatorio propone reforzar módulos de auto-programación",
      summary:
        "Se detectó que el núcleo de auto-programación aún puede expandirse con más módulos especializados.",
      type: "improvement",
      risk: "low",
      reason:
        "El observatorio detectó margen de crecimiento en la capa autoprog.",
      proposedBy: "rafael",
      source: "scan",
      tags: ["observatory", "autoprog", "growth"],
      files: [],
    });

    created.push(proposal);
  }

  if (report.stats.apiRoutesCount < 20) {
    const proposal = await createProposal({
      title: "Observatorio propone ampliar rutas API del sistema",
      summary:
        "La cantidad de rutas API todavía puede crecer para separar mejor funciones del núcleo.",
      type: "improvement",
      risk: "low",
      reason:
        "El observatorio detectó oportunidad de mayor modularidad técnica.",
      proposedBy: "arturo",
      source: "scan",
      tags: ["observatory", "api", "modularity"],
      files: [],
    });

    created.push(proposal);
  }

  return {
    ok: true,
    scannedAt: report.scannedAt,
    createdCount: created.length,
    created,
    stats: report.stats,
    warnings: report.warnings,
  };
}
