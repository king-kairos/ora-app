export type NormalizedRuntimeError = {
  code:
    | "deployment_mismatch"
    | "type_mismatch_branch_shape"
    | "seal_auth_failure"
    | "build_failed_after_patch"
    | "missing_branch_files"
    | "missing_clone_files"
    | "kairos_protected"
    | "unknown";
  confidence: number;
  matchedText: string;
  explanation: string;
};

const RULES: Array<{
  code: NormalizedRuntimeError["code"];
  pattern: RegExp;
  confidence: number;
  explanation: string;
}> = [
  {
    code: "deployment_mismatch",
    pattern: /Failed to find Server Action/i,
    confidence: 0.98,
    explanation:
      "El frontend y la build activa no están alineados o el cliente está usando referencias viejas.",
  },
  {
    code: "type_mismatch_branch_shape",
    pattern: /Property 'name' does not exist on type 'BranchRecord'/i,
    confidence: 0.99,
    explanation:
      "Se intentó leer la propiedad name en un BranchRecord que tipa branchName/title pero no name.",
  },
  {
    code: "seal_auth_failure",
    pattern: /SEAL_DENIED|SEAL_REQUIRED/i,
    confidence: 0.99,
    explanation:
      "Falló la autorización soberana por sello ausente o incorrecto.",
  },
  {
    code: "build_failed_after_patch",
    pattern: /PUBLISH_BUILD_FAIL_AFTER_APPLY/i,
    confidence: 0.95,
    explanation:
      "Un parche fue aplicado, pero el build posterior falló.",
  },
  {
    code: "missing_branch_files",
    pattern: /missing-branch-files/i,
    confidence: 0.9,
    explanation:
      "Faltan archivos esperados para una rama registrada.",
  },
  {
    code: "missing_clone_files",
    pattern: /missing-clone-files/i,
    confidence: 0.9,
    explanation:
      "Faltan archivos esperados para un clon registrado.",
  },
  {
    code: "kairos_protected",
    pattern: /kairos_unreachable.*HTTP_401|HTTP_401.*kairos_unreachable|kairos_protected|\/kairos.*HTTP_401/i,
    confidence: 0.97,
    explanation:
      "La ruta /kairos está protegida y responde 401. No es una caída real del sistema.",
  },
];

export function normalizeRuntimeError(
  raw: string
): NormalizedRuntimeError {
  const text = String(raw || "").trim();

  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      return {
        code: rule.code,
        confidence: rule.confidence,
        matchedText: text,
        explanation: rule.explanation,
      };
    }
  }

  return {
    code: "unknown",
    confidence: 0.2,
    matchedText: text,
    explanation: "No hubo coincidencia con patrones conocidos.",
  };
}

export function normalizeRuntimeErrors(
  values: string[]
): NormalizedRuntimeError[] {
  return (Array.isArray(values) ? values : [])
    .map((value) => normalizeRuntimeError(value))
    .filter((item) => item.matchedText);
}
