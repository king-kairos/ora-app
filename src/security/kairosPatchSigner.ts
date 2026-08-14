import crypto from "crypto";

/**
 * KAIROS_PATCH_SERVER_SIGNER_V1
 *
 * Firma requests sensibles exclusivamente en runtime Node/server.
 *
 * REGLA:
 * - KAIROS_PATCH_SECRET nunca llega al navegador.
 * - No usa NEXT_PUBLIC_*.
 * - No imprime ni devuelve el secreto.
 */

function stableStringify(value: any): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }

  const keys = Object.keys(value).sort();

  return (
    "{" +
    keys
      .map(
        (key) =>
          JSON.stringify(key) +
          ":" +
          stableStringify(value[key])
      )
      .join(",") +
    "}"
  );
}

export function buildKairosPatchHeaders(input: {
  seal: string;
  method: string;
  path: string;
  body?: unknown;
}): Record<string, string> {
  const secret = String(
    process.env.KAIROS_PATCH_SECRET || ""
  ).trim();

  if (!secret) {
    throw new Error("KAIROS_PATCH_SECRET_MISSING");
  }

  const seal = String(input.seal || "").trim();
  const method = String(input.method || "POST")
    .trim()
    .toUpperCase();
  const path = String(input.path || "").trim();
  const body = input.body ?? {};

  if (!seal) {
    throw new Error("KAIROS_SEAL_MISSING");
  }

  if (!path.startsWith("/")) {
    throw new Error("KAIROS_PATCH_PATH_INVALID");
  }

  const ts = String(Date.now());
  const nonce = crypto.randomBytes(16).toString("hex");

  const canonicalBody = stableStringify(body);

  const bodyHash = crypto
    .createHash("sha256")
    .update(canonicalBody, "utf8")
    .digest("hex");

  const message =
    `${ts}.${nonce}.${method}.${path}.${bodyHash}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(message, "utf8")
    .digest("hex");

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-kairos-seal": seal,
    "x-kairos-patch-ts": ts,
    "x-kairos-patch-nonce": nonce,
    "x-kairos-patch-body": bodyHash,
    "x-kairos-patch-sig": signature,
  };
}
