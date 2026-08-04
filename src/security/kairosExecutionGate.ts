import crypto from "crypto";

export const KAIROS_EXECUTION_ACTIONS = [
  "apply_patch",
  "write_file",
  "create_file",
  "delete_file",
  "move_file",
  "publish",
  "deploy",
  "restart_front",
  "restart_core",
  "restart_process",
  "rollback",
  "git_commit",
  "git_push",
  "modify_runtime",
  "modify_security",
  "modify_identity",
] as const;

export type KairosExecutionAction =
  (typeof KAIROS_EXECUTION_ACTIONS)[number];

export type KairosExecutionAuthorization =
  | {
      ok: true;
      action: KairosExecutionAction;
      authorizedBy: "KAIROS_SEAL";
    }
  | {
      ok: false;
      action: KairosExecutionAction;
      status: 403 | 503;
      error:
        | "KAIROS_SEAL_NOT_CONFIGURED"
        | "KAIROS_SEAL_MISSING"
        | "KAIROS_SEAL_INVALID";
    };

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function readReceivedSeal(req: Request): string {
  return clean(
    req.headers.get("x-kairos-seal") ??
      req.headers.get("kairos-seal")
  );
}

/**
 * Puerta única de autoridad para acciones que producen efectos reales.
 *
 * Regla fail-closed:
 * - Sin KAIROS_SEAL configurado: bloquea.
 * - Sin sello recibido: bloquea.
 * - Con sello incorrecto: bloquea.
 * - Solo coincidencia exacta autoriza.
 *
 * Esta función nunca imprime ni devuelve el valor del sello.
 */
export function authorizeKairosExecution(
  req: Request,
  action: KairosExecutionAction
): KairosExecutionAuthorization {
  const expected = clean(process.env.KAIROS_SEAL);

  if (!expected) {
    return {
      ok: false,
      action,
      status: 503,
      error: "KAIROS_SEAL_NOT_CONFIGURED",
    };
  }

  const received = readReceivedSeal(req);

  if (!received) {
    return {
      ok: false,
      action,
      status: 403,
      error: "KAIROS_SEAL_MISSING",
    };
  }

  if (!safeEqual(received, expected)) {
    return {
      ok: false,
      action,
      status: 403,
      error: "KAIROS_SEAL_INVALID",
    };
  }

  return {
    ok: true,
    action,
    authorizedBy: "KAIROS_SEAL",
  };
}

export function isKairosExecutionAction(
  value: unknown
): value is KairosExecutionAction {
  return KAIROS_EXECUTION_ACTIONS.includes(
    value as KairosExecutionAction
  );
}
