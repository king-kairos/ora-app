// src/ai/autoprog/applyPatch.ts
import fs from "fs/promises";
import path from "path";
import { getProposal } from "./patchStore";

const ROOT = process.cwd();

const ALLOW_PREFIX = ["src/", "public/", "data/", "app/"];

const BLOCK_EXT = [
  ".sh",
  ".bash",
  ".zsh",
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".ps1",
];

const BLOCK_EXACT = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "src/app.ts",
];

const BLOCK_PREFIX = [
  ".git/",
  "node_modules/",
  "src/ai/security/",
  "src/ai/core/",
];

const MAX_FILE_BYTES = 1024 * 1024 * 2; // 2 MB por archivo
const MAX_TOTAL_FILES = 100;

export type PatchFile = {
  path: string;
  content?: string;
  delete?: boolean | string;
  mode?: string;
  note?: string;
  marker?: string;
  startMarker?: string;
  endMarker?: string;
  find?: string;
  replaceWith?: string;
  operations?: Array<{
    type?: string;
    mode?: string;
    content?: string;
    marker?: string;
    startMarker?: string;
    endMarker?: string;
    start?: string;
    end?: string;
    find?: string;
    replace?: string;
    replaceWith?: string;
  }>;
};

export type Proposal = {
  id: string;
  title?: string;
  status?: string;
  files: PatchFile[];
  metadata?: Record<string, any> | null;
};

export type ApplyResultItem = {
  path: string;
  action: "written" | "deleted" | "modified";
  ok: boolean;
  bytes?: number;
  note?: string;
};

export type ApplyPlan = {
  requiresBuild: boolean;
  requiresOraRestart: boolean;
  requiresFrontRestart: boolean;
  touchedZones: string[];
  recommendedCommands: string[];
};

export type ApplyResult = {
  ok: boolean;
  id: string;
  results: ApplyResultItem[];
  plan: ApplyPlan;
};

function normalizeRel(p: string): string {
  const raw = String(p || "").trim().replace(/\\/g, "/");
  const rel = path.posix.normalize(raw).replace(/^\/+/, "");

  if (!rel || rel === "." || rel === "/") {
    throw new Error("empty_path");
  }

  if (
    rel === ".." ||
    rel.startsWith("../") ||
    rel.includes("/../") ||
    path.posix.isAbsolute(rel)
  ) {
    throw new Error("path_traversal");
  }

  return rel;
}

function isAllowed(rel: string): boolean {
  const lower = rel.toLowerCase();

  if (!ALLOW_PREFIX.some((pre) => rel.startsWith(pre))) return false;
  if (BLOCK_EXT.some((ext) => lower.endsWith(ext))) return false;
  if (BLOCK_EXACT.some((x) => lower === x.toLowerCase())) return false;
  if (BLOCK_PREFIX.some((pre) => lower.startsWith(pre.toLowerCase()))) {
    return false;
  }

  return true;
}

function wantsDeleteFile(f: PatchFile): boolean {
  return f.delete === true || String(f.delete || "").toLowerCase() === "true";
}

function assertContentSize(content: string) {
  const bytes = Buffer.byteLength(String(content || ""), "utf8");
  if (bytes > MAX_FILE_BYTES) {
    throw new Error("content_too_large");
  }
}

async function readUtf8(abs: string): Promise<string> {
  return fs.readFile(abs, "utf8");
}

async function readUtf8IfExists(abs: string): Promise<string | null> {
  try {
    return await fs.readFile(abs, "utf8");
  } catch (e: any) {
    if (e?.code === "ENOENT") return null;
    throw e;
  }
}

async function assertSafeFsTarget(abs: string): Promise<void> {
  const rootResolved = path.resolve(ROOT);
  const absResolved = path.resolve(abs);

  if (
    absResolved !== rootResolved &&
    !absResolved.startsWith(rootResolved + path.sep)
  ) {
    throw new Error("path_outside_root");
  }

  try {
    const st = await fs.lstat(absResolved);
    if (st.isSymbolicLink()) {
      throw new Error("symlink_target_denied");
    }
  } catch (e: any) {
    if (e?.code === "ENOENT") return;
    throw e;
  }
}

async function writeUtf8(abs: string, content: string): Promise<void> {
  assertContentSize(content);
  await assertSafeFsTarget(abs);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf8");
}

function requireNonEmpty(
  value: string | undefined,
  errorCode: string
): string {
  const out = String(value || "");
  if (!out) throw new Error(errorCode);
  return out;
}

function injectBeforeMarker(
  src: string,
  marker: string,
  snippet: string
): string {
  const idx = src.indexOf(marker);
  if (idx < 0) {
    throw new Error(`INSERTION_MARKER_NOT_FOUND:${marker}`);
  }

  const before = src.slice(0, idx).trimEnd();
  const after = src.slice(idx);

  return `${before}\n\n${snippet}\n\n${after}`;
}

function injectAfterMarker(
  src: string,
  marker: string,
  snippet: string
): string {
  const idx = src.indexOf(marker);
  if (idx < 0) {
    throw new Error(`INSERTION_MARKER_NOT_FOUND:${marker}`);
  }

  const afterStart = idx + marker.length;
  const before = src.slice(0, afterStart).trimEnd();
  const after = src.slice(afterStart).trimStart();

  return `${before}\n\n${snippet}\n\n${after}`;
}

function replaceBetweenMarkers(
  src: string,
  startMarker: string,
  endMarker: string,
  replacement: string
): string {
  const startIdx = src.indexOf(startMarker);
  if (startIdx < 0) {
    throw new Error(`START_MARKER_NOT_FOUND:${startMarker}`);
  }

  const searchFrom = startIdx + startMarker.length;
  const endIdx = src.indexOf(endMarker, searchFrom);
  if (endIdx < 0) {
    throw new Error(`END_MARKER_NOT_FOUND:${endMarker}`);
  }

  const before = src.slice(0, searchFrom).trimEnd();
  const after = src.slice(endIdx).trimStart();

  return `${before}\n\n${replacement}\n\n${after}`;
}

function appendIfMissing(
  src: string,
  content: string
): { changed: boolean; next: string } {
  if (!content) return { changed: false, next: src };
  if (src.includes(content)) return { changed: false, next: src };

  const separator = src.endsWith("\n") || !src ? "" : "\n";
  return {
    changed: true,
    next: `${src}${separator}${content}`,
  };
}

function replaceExact(src: string, find: string, replaceWith: string): string {
  if (!find) throw new Error("REPLACE_FIND_MISSING");
  if (!src.includes(find)) {
    throw new Error("REPLACE_FIND_NOT_FOUND");
  }

  const occurrences = src.split(find).length - 1;
  if (occurrences !== 1) {
    throw new Error("REPLACE_FIND_AMBIGUOUS");
  }

  return src.replace(find, replaceWith);
}

async function ensureExistingRegularFile(
  abs: string,
  rel: string
): Promise<void> {
  const st = await fs.lstat(abs);
  if (!st.isFile()) {
    throw new Error(`target_not_regular_file:${rel}`);
  }
}

async function applyModifyExistingFile(
  rel: string,
  abs: string,
  content: string
): Promise<ApplyResultItem> {
  await ensureExistingRegularFile(abs, rel);

  if (!content.trim()) {
    throw new Error(`MODIFY_CONTENT_EMPTY:${rel}`);
  }

  await writeUtf8(abs, content);

  return {
    path: rel,
    action: "modified",
    ok: true,
    bytes: Buffer.byteLength(content, "utf8"),
    note: "modify_existing_file_full_replace",
  };
}

async function applyAppendMode(
  rel: string,
  abs: string,
  content: string
): Promise<ApplyResultItem> {
  const current = (await readUtf8IfExists(abs)) || "";
  const separator = current.endsWith("\n") || !current ? "" : "\n";
  const next = `${current}${separator}${content}`;

  await writeUtf8(abs, next);

  return {
    path: rel,
    action: "modified",
    ok: true,
    bytes: Buffer.byteLength(next, "utf8"),
    note: "append_mode",
  };
}

async function applyPrependMode(
  rel: string,
  abs: string,
  content: string
): Promise<ApplyResultItem> {
  const current = (await readUtf8IfExists(abs)) || "";
  const separator = content.endsWith("\n") || !current ? "" : "\n";
  const next = `${content}${separator}${current}`;

  await writeUtf8(abs, next);

  return {
    path: rel,
    action: "modified",
    ok: true,
    bytes: Buffer.byteLength(next, "utf8"),
    note: "prepend_mode",
  };
}

async function applyFullFileMode(
  rel: string,
  abs: string,
  content: string
): Promise<ApplyResultItem> {
  if (!content || !content.trim()) {
    throw new Error(`FULL_FILE_CONTENT_EMPTY:${rel}`);
  }

  await writeUtf8(abs, content);

  return {
    path: rel,
    action: "written",
    ok: true,
    bytes: Buffer.byteLength(content, "utf8"),
    note: "full_file_mode",
  };
}

async function applyInsertBeforeMarkerMode(
  rel: string,
  abs: string,
  marker: string,
  content: string
): Promise<ApplyResultItem> {
  await ensureExistingRegularFile(abs, rel);
  const current = await readUtf8(abs);
  const next = injectBeforeMarker(current, marker, content);

  await writeUtf8(abs, next);

  return {
    path: rel,
    action: "modified",
    ok: true,
    bytes: Buffer.byteLength(next, "utf8"),
    note: "insert_before_marker",
  };
}

async function applyInsertAfterMarkerMode(
  rel: string,
  abs: string,
  marker: string,
  content: string
): Promise<ApplyResultItem> {
  await ensureExistingRegularFile(abs, rel);
  const current = await readUtf8(abs);
  const next = injectAfterMarker(current, marker, content);

  await writeUtf8(abs, next);

  return {
    path: rel,
    action: "modified",
    ok: true,
    bytes: Buffer.byteLength(next, "utf8"),
    note: "insert_after_marker",
  };
}

async function applyReplaceBetweenMarkersMode(
  rel: string,
  abs: string,
  startMarker: string,
  endMarker: string,
  content: string
): Promise<ApplyResultItem> {
  await ensureExistingRegularFile(abs, rel);
  const current = await readUtf8(abs);
  const next = replaceBetweenMarkers(current, startMarker, endMarker, content);

  await writeUtf8(abs, next);

  return {
    path: rel,
    action: "modified",
    ok: true,
    bytes: Buffer.byteLength(next, "utf8"),
    note: "replace_between_markers",
  };
}

async function applyAppendIfMissingMode(
  rel: string,
  abs: string,
  content: string
): Promise<ApplyResultItem> {
  const current = (await readUtf8IfExists(abs)) || "";
  const { changed, next } = appendIfMissing(current, content);

  if (!changed) {
    return {
      path: rel,
      action: "modified",
      ok: true,
      bytes: 0,
      note: "append_if_missing_skipped_already_present",
    };
  }

  await writeUtf8(abs, next);

  return {
    path: rel,
    action: "modified",
    ok: true,
    bytes: Buffer.byteLength(next, "utf8"),
    note: "append_if_missing",
  };
}

async function applyReplaceExactMode(
  rel: string,
  abs: string,
  find: string,
  replaceWith: string
): Promise<ApplyResultItem> {
  await ensureExistingRegularFile(abs, rel);
  const current = await readUtf8(abs);
  const next = replaceExact(current, find, replaceWith);

  await writeUtf8(abs, next);

  return {
    path: rel,
    action: "modified",
    ok: true,
    bytes: Buffer.byteLength(next, "utf8"),
    note: "replace_exact",
  };
}

function detectTouchedZones(paths: string[]): string[] {
  const zones = new Set<string>();

  for (const rel of paths) {
    if (rel.startsWith("src/")) zones.add("backend-src");
    if (rel.startsWith("app/")) zones.add("next-app");
    if (rel.startsWith("public/")) zones.add("public-assets");
    if (rel.startsWith("data/")) zones.add("data");
  }

  return Array.from(zones);
}

function buildExecutionPlan(results: ApplyResultItem[]): ApplyPlan {
  const touchedPaths = results.map((r) => r.path);
  const touchedZones = detectTouchedZones(touchedPaths);

  const requiresBuild = touchedPaths.some(
    (p) =>
      p.startsWith("app/") ||
      p.startsWith("src/") ||
      p.endsWith(".ts") ||
      p.endsWith(".tsx") ||
      p.endsWith(".js") ||
      p.endsWith(".jsx")
  );

  const requiresOraRestart = touchedPaths.some(
    (p) => p.startsWith("src/") || p.startsWith("data/")
  );

  const requiresFrontRestart = touchedPaths.some(
    (p) => p.startsWith("app/") || p.startsWith("public/")
  );

  const recommendedCommands: string[] = [];

  if (requiresBuild) {
    recommendedCommands.push("npm run build");
  }

  if (requiresOraRestart) {
    recommendedCommands.push("pm2 restart ora");
  }

  if (requiresFrontRestart) {
    recommendedCommands.push("pm2 restart ora-front");
  }

  return {
    requiresBuild,
    requiresOraRestart,
    requiresFrontRestart,
    touchedZones,
    recommendedCommands,
  };
}

export async function applyPatch(
  input: string | Partial<Proposal>
): Promise<ApplyResult> {
  let proposal: any = input;

  if (typeof input === "string") {
    proposal = await getProposal(input);
  }

  if (proposal && !Array.isArray(proposal.files) && proposal.id) {
    proposal = await getProposal(String(proposal.id));
  }

  if (!proposal) {
    throw new Error("proposal_not_found");
  }

  if (!proposal.id) {
    throw new Error("proposal_id_missing");
  }

  if (!Array.isArray(proposal.files) || proposal.files.length === 0) {
    throw new Error("proposal_files_missing");
  }

  if (proposal.files.length > MAX_TOTAL_FILES) {
    throw new Error("proposal_files_exceeded");
  }

  if (String(proposal.status || "").toLowerCase() !== "approved") {
    throw new Error("proposal_not_approved");
  }

  const results: ApplyResultItem[] = [];

  const filesToApply: PatchFile[] = [];

  for (const rawFile of proposal.files) {
    const base = rawFile as PatchFile;

    if (Array.isArray(base.operations) && base.operations.length > 0) {
      for (const op of base.operations) {
        filesToApply.push({
          ...base,
          mode: String(op.type || op.mode || "").trim(),
          content: typeof op.content === "string" ? op.content : base.content,
          marker: op.marker || base.marker,
          startMarker: op.startMarker || op.start || base.startMarker,
          endMarker: op.endMarker || op.end || base.endMarker,
          find: op.find || base.find,
          replaceWith:
            typeof op.replaceWith === "string"
              ? op.replaceWith
              : typeof op.replace === "string"
                ? op.replace
                : base.replaceWith,
          operations: undefined,
        });
      }
    } else {
      filesToApply.push(base);
    }
  }

  if (filesToApply.length > MAX_TOTAL_FILES) {
    throw new Error("proposal_operations_exceeded");
  }

  for (const rawFile of filesToApply) {
    const f = rawFile as PatchFile;
    const rel = normalizeRel(f?.path || "");

    if (!isAllowed(rel)) {
      throw new Error(`path_not_allowed:${rel}`);
    }

    const abs = path.join(ROOT, rel);
    await assertSafeFsTarget(abs);

    const mode = String(f?.mode || "").trim().toLowerCase();
    const content = String(f?.content ?? "");

    if (wantsDeleteFile(f)) {
      try {
        const st = await fs.lstat(abs);

        if (st.isSymbolicLink()) {
          throw new Error(`delete_symlink_denied:${rel}`);
        }

        if (!st.isFile()) {
          throw new Error(`delete_non_file_denied:${rel}`);
        }

        await fs.unlink(abs);
        results.push({ path: rel, action: "deleted", ok: true });
      } catch (e: any) {
        if (e?.code === "ENOENT") {
          results.push({
            path: rel,
            action: "deleted",
            ok: true,
            note: "missing_ok",
          });
        } else {
          throw e;
        }
      }
      continue;
    }

    if (mode === "note") {
      results.push({
        path: rel,
        action: "written",
        ok: true,
        note: "note_mode_no_write",
      });
      continue;
    }

    if (mode === "modify-existing-file") {
      const modified = await applyModifyExistingFile(rel, abs, content);
      results.push(modified);
      continue;
    }

    if (mode === "insert-before-marker") {
      const marker = requireNonEmpty(f.marker, "MARKER_MISSING");
      const modified = await applyInsertBeforeMarkerMode(
        rel,
        abs,
        marker,
        content
      );
      results.push(modified);
      continue;
    }

    if (mode === "insert-after-marker") {
      const marker = requireNonEmpty(f.marker, "MARKER_MISSING");
      const modified = await applyInsertAfterMarkerMode(
        rel,
        abs,
        marker,
        content
      );
      results.push(modified);
      continue;
    }

    if (mode === "replace-between-markers") {
      const startMarker = requireNonEmpty(
        f.startMarker,
        "START_MARKER_MISSING"
      );
      const endMarker = requireNonEmpty(f.endMarker, "END_MARKER_MISSING");

      const modified = await applyReplaceBetweenMarkersMode(
        rel,
        abs,
        startMarker,
        endMarker,
        content
      );
      results.push(modified);
      continue;
    }

    if (mode === "append-if-missing") {
      const modified = await applyAppendIfMissingMode(rel, abs, content);
      results.push(modified);
      continue;
    }

    if (mode === "replace-exact") {
      const find = requireNonEmpty(f.find, "REPLACE_FIND_MISSING");
      const replaceWith =
        typeof f.replaceWith === "string" ? f.replaceWith : content;

      const modified = await applyReplaceExactMode(
        rel,
        abs,
        find,
        replaceWith
      );
      results.push(modified);
      continue;
    }

    if (mode === "append") {
      const appended = await applyAppendMode(rel, abs, content);
      results.push(appended);
      continue;
    }

    if (mode === "prepend") {
      const prepended = await applyPrependMode(rel, abs, content);
      results.push(prepended);
      continue;
    }

    if (mode === "full-file" || mode === "replace" || mode === "") {
      const written = await applyFullFileMode(rel, abs, content);
      results.push(written);
      continue;
    }

    throw new Error(`UNSUPPORTED_MODE:${mode || "empty"}`);
  }

  const plan = buildExecutionPlan(results);

  return {
    ok: true,
    id: String(proposal.id),
    results,
    plan,
  };
}

export async function applyProposal(
  proposal: Proposal
): Promise<ApplyResult> {
  return applyPatch(proposal);
}

export default applyPatch;
