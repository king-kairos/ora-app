import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd());

const BLOCKED_EXACT = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
]);

const BLOCKED_PREFIXES = [
  ".git/",
  ".next/",
  "node_modules/",
];

export type KairosFileTarget = {
  root: string;
  relative: string;
  absolute: string;
};

function normalizeRelativePath(input: unknown): string {
  const raw = String(input ?? "")
    .trim()
    .replace(/\0/g, "")
    .replace(/\\/g, "/");

  if (!raw) {
    throw new Error("FILE_PATH_REQUIRED");
  }

  if (path.posix.isAbsolute(raw) || path.win32.isAbsolute(raw)) {
    throw new Error("ABSOLUTE_PATH_NOT_ALLOWED");
  }

  const normalized = path.posix
    .normalize(raw)
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");

  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error("INVALID_FILE_PATH");
  }

  return normalized;
}

function isInsideRoot(absolute: string): boolean {
  const relative = path.relative(ROOT, absolute);

  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function assertNotBlocked(relative: string): void {
  const normalized = relative
    .replace(/\\/g, "/")
    .toLowerCase();

  if (
    BLOCKED_EXACT.has(normalized) ||
    normalized.startsWith(".env.")
  ) {
    throw new Error("SENSITIVE_FILE_BLOCKED");
  }

  if (
    BLOCKED_PREFIXES.some(
      (prefix) =>
        normalized === prefix.slice(0, -1) ||
        normalized.startsWith(prefix)
    )
  ) {
    throw new Error("PROTECTED_PATH_BLOCKED");
  }
}

function nearestExistingAncestor(
  absolute: string
): string {
  let current = absolute;

  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);

    if (parent === current) {
      throw new Error("FILE_ANCESTOR_NOT_FOUND");
    }

    current = parent;
  }

  return current;
}

function assertNoSymlinkEscape(
  absolute: string
): void {
  const ancestor =
    nearestExistingAncestor(absolute);

  const realAncestor =
    fs.realpathSync(ancestor);

  if (!isInsideRoot(realAncestor)) {
    throw new Error("SYMLINK_PATH_ESCAPE");
  }
}

export function resolveKairosFileTarget(
  input: unknown
): KairosFileTarget {
  const relative =
    normalizeRelativePath(input);

  assertNotBlocked(relative);

  const absolute = path.resolve(
    ROOT,
    relative
  );

  if (!isInsideRoot(absolute)) {
    throw new Error("PATH_OUTSIDE_PROJECT");
  }

  assertNoSymlinkEscape(absolute);

  return {
    root: ROOT,
    relative,
    absolute,
  };
}
