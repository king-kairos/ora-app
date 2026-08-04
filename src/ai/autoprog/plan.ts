export async function autoprogPlan(goal: string) {
  return {
    plan: [
      "Analizar objetivo",
      "Proponer cambios",
      "Generar patch (sin ejecutar)",
    ],
    patch: {
      title: "Autoprog stub",
      notes: "Este es un stub mínimo para que el sistema compile.",
      files: [
        {
          path: "notes/autoprog_stub.txt",
          content: `GOAL: ${goal}\n\n[stub] Autoprog funcionando.\n`,
        },
      ],
    },
  };
}
