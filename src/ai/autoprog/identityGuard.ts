// src/ai/autoprog/identityGuard.ts

type GuardAction =
  | "create_branch"
  | "create_clone"
  | "create_module"
  | "proposal_only"
  | "unknown";

export type IdentityGuardInput = {
  action: GuardAction;
  branchName?: string;
  cloneName?: string;
  moduleName?: string;
  supervisor?: string;
  target?: string;
  metadata?: Record<string, any> | null;
};

export type IdentityGuardResult = {
  ok: boolean;
  reason?: string;
  normalized: {
    action: GuardAction;
    branchName?: string;
    cloneName?: string;
    moduleName?: string;
    supervisor?: string;
    target?: string;
  };
};

const OFFICIAL_SUPERVISORS = new Set([
  "rafael",
  "kaerliana",
  "arturo",
  "orion",
  "lucian",
  "ignis",
]);

const FORBIDDEN_VALUES = new Set([
  "",
  "undefined",
  "null",
  "nan",
  "false",
  "true",
  "branch",
  "clone",
  "module",
]);

function clean(value: any): string {
  return String(value || "").trim();
}

function slugify(input: string): string {
  const raw = clean(input);
  if (!raw) return "";

  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isForbiddenName(value: string): boolean {
  const v = slugify(value);
  if (!v) return true;
  if (FORBIDDEN_VALUES.has(v)) return true;
  if (/^branch-\d+$/.test(v)) return true;
  if (/^clone-\d+$/.test(v)) return true;
  if (/^module-\d+$/.test(v)) return true;
  return false;
}

function normalizeSupervisor(value: any): string {
  const v = slugify(value);
  return OFFICIAL_SUPERVISORS.has(v) ? v : "rafael";
}

export function validateIdentity(input: IdentityGuardInput): IdentityGuardResult {
  const action = input.action;
  const branchName = slugify(input.branchName || "");
  const cloneName = slugify(input.cloneName || "");
  const moduleName = slugify(input.moduleName || "");
  const supervisor = normalizeSupervisor(input.supervisor || "");
  const target = slugify(input.target || "");

  if (action === "create_branch") {
    if (isForbiddenName(branchName)) {
      return {
        ok: false,
        reason: "INVALID_BRANCH_NAME",
        normalized: { action, branchName, supervisor },
      };
    }

    return {
      ok: true,
      normalized: { action, branchName, supervisor },
    };
  }

  if (action === "create_clone") {
    if (isForbiddenName(cloneName)) {
      return {
        ok: false,
        reason: "INVALID_CLONE_NAME",
        normalized: { action, cloneName, branchName, supervisor, target },
      };
    }

    if (isForbiddenName(branchName)) {
      return {
        ok: false,
        reason: "INVALID_BRANCH_NAME_FOR_CLONE",
        normalized: { action, cloneName, branchName, supervisor, target },
      };
    }

    return {
      ok: true,
      normalized: { action, cloneName, branchName, supervisor, target },
    };
  }

  if (action === "create_module") {
    if (isForbiddenName(moduleName)) {
      return {
        ok: false,
        reason: "INVALID_MODULE_NAME",
        normalized: { action, moduleName },
      };
    }

    return {
      ok: true,
      normalized: { action, moduleName },
    };
  }

  return {
    ok: true,
    normalized: {
      action,
      branchName,
      cloneName,
      moduleName,
      supervisor,
      target,
    },
  };
}
