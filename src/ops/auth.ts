import { Request } from "express";

const ROOT = "KAIROS.ROOT";

export function requireKairosRoot(req: Request) {
  // acepta cualquiera de estos headers
  const header =
    req.header("x-kairos-root") ||
    req.header("X-KAIROS-ROOT") ||
    req.header("authorization") ||
    req.header("Authorization");

  if (!header) {
    throw new Error("No autorizado (sin header)");
  }

  // normaliza Bearer si existe
  const value = header.replace(/^Bearer\s+/i, "").trim();

  if (value !== ROOT) {
    throw new Error("No autorizado (KAIROS.ROOT)");
  }

  return true;
}
