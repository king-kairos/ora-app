import {
  BRANCH_TARGETS,
  type SovereignBranch,
} from "./branchTargets";

export type TargetResolverResult = {
  branch: string | null;
  resolver: "BRANCH_TARGETS" | "FALLBACK_INFERENCE";
  recognizedBranch: boolean;
  validated: boolean;
  mismatch: boolean;
  targetFiles: string[];
  invalidTargets: string[];
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalize(value: unknown) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function unique(items: string[]) {
  return Array.from(
    new Set(items.map(clean).filter(Boolean))
  );
}

export function normalizeSovereignBranch(
  value: unknown
): SovereignBranch | null {
  const branch = normalize(value);

  if (branch === "presence" || branch === "presencia") {
    return "presence";
  }

  if (branch === "marketing") {
    return "marketing";
  }

  if (
    branch === "pollera" ||
    branch === "pollo" ||
    branch === "pollos"
  ) {
    return "pollera";
  }

  if (
    branch === "agriculture" ||
    branch === "agricultura"
  ) {
    return "agriculture";
  }

  if (
    branch === "health" ||
    branch === "salud"
  ) {
    return "health";
  }

  if (
    branch === "security" ||
    branch === "seguridad"
  ) {
    return "security";
  }

  return null;
}

export function getTargetsForBranch(
  branch: unknown
): string[] {
  const normalized = normalizeSovereignBranch(branch);

  if (!normalized) return [];

  return [...BRANCH_TARGETS[normalized]];
}

export function targetBelongsToBranch(
  target: string,
  branch: SovereignBranch
) {
  const value = clean(target).replace(/\\/g, "/");

  return (
    value.startsWith(`app/${branch}/`) ||
    value.startsWith(`app/api/${branch}/`) ||
    value.startsWith(`src/${branch}/`)
  );
}

export function validateTargetsForBranch(
  branch: unknown,
  targets: string[]
): TargetResolverResult {
  const normalizedBranch =
    normalizeSovereignBranch(branch);

  const targetFiles = unique(targets);

  if (!normalizedBranch) {
    return {
      branch: clean(branch) || null,
      resolver: "FALLBACK_INFERENCE",
      recognizedBranch: false,
      validated: true,
      mismatch: false,
      targetFiles,
      invalidTargets: [],
    };
  }

  const invalidTargets = targetFiles.filter(
    (target) =>
      !targetBelongsToBranch(target, normalizedBranch)
  );

  return {
    branch: normalizedBranch,
    resolver: "BRANCH_TARGETS",
    recognizedBranch: true,
    validated: invalidTargets.length === 0,
    mismatch: invalidTargets.length > 0,
    targetFiles,
    invalidTargets,
  };
}

export function resolveSovereignTargets(input: {
  branch?: unknown;
  givenTargets?: string[];
  fallbackTargets?: string[];
}): TargetResolverResult {
  const normalizedBranch =
    normalizeSovereignBranch(input.branch);

  const givenTargets = unique(
    Array.isArray(input.givenTargets)
      ? input.givenTargets
      : []
  );

  /*
   * Los targets explícitos tienen prioridad, pero deben validarse
   * contra la rama soberana detectada.
   */
  if (givenTargets.length > 0) {
    return validateTargetsForBranch(
      normalizedBranch || input.branch,
      givenTargets
    );
  }

  const fallbackTargets = unique(
    Array.isArray(input.fallbackTargets)
      ? input.fallbackTargets
      : []
  );

  /*
   * Si ya existe una selección semántica concreta, conservarla
   * y validarla contra la rama soberana reconocida.
   */
  if (normalizedBranch && fallbackTargets.length > 0) {
    return validateTargetsForBranch(
      normalizedBranch,
      fallbackTargets
    );
  }

  /*
   * Sin selección semántica previa, usar el registro completo
   * de targets de la rama reconocida.
   */
  if (normalizedBranch) {
    const branchTargets =
      getTargetsForBranch(normalizedBranch);

    return validateTargetsForBranch(
      normalizedBranch,
      branchTargets
    );
  }

  return {
    branch: clean(input.branch) || null,
    resolver: "FALLBACK_INFERENCE",
    recognizedBranch: false,
    validated: true,
    mismatch: false,
    targetFiles: fallbackTargets,
    invalidTargets: [],
  };
}
