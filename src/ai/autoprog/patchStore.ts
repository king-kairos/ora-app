// src/ai/autoprog/patchStore.ts
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type PatchFile = {
  path: string;
  content?: string;
  delete?: boolean;
  mode?: string;
  note?: string;
  marker?: string;
  startMarker?: string;
  endMarker?: string;
  find?: string;
  replaceWith?: string;
  operations?: Array<Record<string, any>>;
};

export type ProposalMetadata = Record<string, any> | null;

export type ProposalStatus =
  | "pending"
  | "approved"
  | "applied"
  | "published"
  | "denied"
  | "archived"
  | "rejected";

export type Proposal = {
  id: string;
  title?: string;
  summary?: string;
  type?: string;
  risk?: string;
  reason?: string;
  proposedBy?: string;
  source?: string;
  status: ProposalStatus;
  createdAt: number;
  updatedAt?: number;
  approvedAt?: number;
  appliedAt?: number;
  publishedAt?: number;
  deniedAt?: number;
  archivedAt?: number;
  rejectedAt?: number;
  files: PatchFile[];
  archived?: boolean;
  metadata?: ProposalMetadata;
  tags?: string[];
  targetFiles?: string[];
  fingerprint?: string;
};

const DB_FILE = path.join(process.cwd(), "data", "patches.json");
const PROPOSALS_DIR = path.join(process.cwd(), "ora-data", "proposals");

const VALID_STATUSES: ProposalStatus[] = [
  "pending",
  "approved",
  "applied",
  "published",
  "denied",
  "archived",
  "rejected",
];

const VALID_RISKS = new Set(["low", "medium", "high", "unknown"]);
const VALID_TYPES = new Set(["patch", "intent", "proposal"]);
const MAX_TITLE_LENGTH = 240;
const MAX_SUMMARY_LENGTH = 5000;
const MAX_REASON_LENGTH = 5000;
const MAX_TAGS = 50;
const MAX_FILES = 100;
const MAX_METADATA_BYTES = 1024 * 256;
const MAX_CONTENT_BYTES = 1024 * 1024 * 2;

async function readDb(): Promise<Proposal[]> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);

    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.proposals)
      ? parsed.proposals
      : [];

    const normalized: Proposal[] = [];

    for (const item of items) {
      try {
        const proposal = normalizeStoredProposal(item);
        if (proposal) normalized.push(proposal);
      } catch (err) {
        console.error("[patchStore.readDb.normalize]", err);
      }
    }

    return normalized;
  } catch {
    return [];
  }
}

async function writeDb(items: Proposal[]) {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true }).catch(() => {});
  await fs.writeFile(
    DB_FILE,
    JSON.stringify({ proposals: items }, null, 2),
    "utf8"
  );
}

function normalizeString(value: any, maxLen?: number) {
  if (typeof value !== "string") return undefined;
  const out = value.trim();
  if (!out) return undefined;
  return typeof maxLen === "number" ? out.slice(0, maxLen) : out;
}

function normalizeStatus(value: any): ProposalStatus {
  const raw = String(value || "").trim().toLowerCase();
  return VALID_STATUSES.includes(raw as ProposalStatus)
    ? (raw as ProposalStatus)
    : "pending";
}

function normalizeRisk(value: any): string {
  const raw = String(value || "").trim().toLowerCase();
  return VALID_RISKS.has(raw) ? raw : "unknown";
}

function normalizeType(value: any): string {
  const raw = String(value || "").trim().toLowerCase();
  return VALID_TYPES.has(raw) ? raw : "patch";
}

function normalizeTimestamp(value: any, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function normalizePath(value: any): string {
  return String(value || "").trim().replace(/\\/g, "/");
}

function assertContentSize(content: string) {
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes > MAX_CONTENT_BYTES) {
    throw new Error("PATCH_FILE_CONTENT_TOO_LARGE");
  }
}

function normalizeFiles(files: any[]): PatchFile[] {
  if (!Array.isArray(files)) return [];

  const out = files
    .map((f) => {
      const content = typeof f?.content === "string" ? f.content : undefined;

      if (typeof content === "string") {
        assertContentSize(content);
      }

      const replaceWith =
        typeof f?.replaceWith === "string" ? f.replaceWith : undefined;

      if (typeof replaceWith === "string") {
        assertContentSize(replaceWith);
      }

      return {
        path: normalizePath(f?.path),
        content,
        delete:
          f?.delete === true ||
          String(f?.delete || "").trim().toLowerCase() === "true",
        mode: normalizeString(f?.mode, 120),
        note: normalizeString(f?.note, 2000),
        marker: typeof f?.marker === "string" ? f.marker : undefined,
        startMarker:
          typeof f?.startMarker === "string" ? f.startMarker : undefined,
        endMarker:
          typeof f?.endMarker === "string" ? f.endMarker : undefined,
        find: typeof f?.find === "string" ? f.find : undefined,
        replaceWith,
        operations: Array.isArray(f?.operations) ? f.operations : undefined,
      };
    })
    .filter((f) => f.path);

  if (out.length > MAX_FILES) {
    throw new Error("PATCH_FILES_LIMIT_EXCEEDED");
  }

  return out;
}

function normalizeTags(tags: any): string[] {
  if (!Array.isArray(tags)) return [];

  return Array.from(
    new Set(
      tags
        .map((tag) => String(tag || "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, MAX_TAGS)
    )
  );
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(
    new Set(items.map((x) => String(x || "").trim()).filter(Boolean))
  );
}

function normalizeMetadata(metadata: any): ProposalMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const serialized = JSON.stringify(metadata);
  if (Buffer.byteLength(serialized, "utf8") > MAX_METADATA_BYTES) {
    throw new Error("PROPOSAL_METADATA_TOO_LARGE");
  }

  return metadata;
}

function generateFingerprint(
  files: PatchFile[],
  title?: string,
  type?: string
): string {
  const normalized = {
    title: String(title || "").trim(),
    type: String(type || "patch").trim().toLowerCase(),
    files: files.map((f) => ({
      path: f.path,
      content: f.content ?? null,
      delete: !!f.delete,
      mode: f.mode ?? "",
      note: f.note ?? "",
      marker: f.marker ?? "",
      startMarker: f.startMarker ?? "",
      endMarker: f.endMarker ?? "",
      find: f.find ?? "",
      replaceWith: f.replaceWith ?? "",
      operations: f.operations ?? null,
    })),
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

function normalizeStoredProposal(raw: any): Proposal | null {
  if (!raw || typeof raw !== "object") return null;

  const now = Date.now();
  const files = normalizeFiles(Array.isArray(raw.files) ? raw.files : []);
  const status = normalizeStatus(raw.status);

  return {
    id: String(raw.id || "").trim() || crypto.randomBytes(8).toString("hex"),
    title: normalizeString(raw.title, MAX_TITLE_LENGTH),
    summary: normalizeString(raw.summary, MAX_SUMMARY_LENGTH),
    type: normalizeType(raw.type),
    risk: normalizeRisk(raw.risk),
    reason: normalizeString(raw.reason, MAX_REASON_LENGTH),
    proposedBy: normalizeString(raw.proposedBy, 120) || "unknown",
    source: normalizeString(raw.source, 120) || "patchStore",
    status,
    createdAt: normalizeTimestamp(raw.createdAt, now),
    updatedAt: normalizeTimestamp(raw.updatedAt, now),
    approvedAt:
      typeof raw.approvedAt === "number" && Number.isFinite(raw.approvedAt)
        ? raw.approvedAt
        : undefined,
    appliedAt:
      typeof raw.appliedAt === "number" && Number.isFinite(raw.appliedAt)
        ? raw.appliedAt
        : undefined,
    publishedAt:
      typeof raw.publishedAt === "number" && Number.isFinite(raw.publishedAt)
        ? raw.publishedAt
        : undefined,
    deniedAt:
      typeof raw.deniedAt === "number" && Number.isFinite(raw.deniedAt)
        ? raw.deniedAt
        : undefined,
    archivedAt:
      typeof raw.archivedAt === "number" && Number.isFinite(raw.archivedAt)
        ? raw.archivedAt
        : undefined,
    rejectedAt:
      typeof raw.rejectedAt === "number" && Number.isFinite(raw.rejectedAt)
        ? raw.rejectedAt
        : undefined,
    files,
    archived: raw.archived === true || status === "archived",
    metadata: normalizeMetadata(raw.metadata),
    tags: normalizeTags(raw.tags),
    targetFiles: uniqueStrings(
      Array.isArray(raw.targetFiles) && raw.targetFiles.length > 0
        ? raw.targetFiles
        : files.map((f) => f.path)
    ),
    fingerprint:
      normalizeString(raw.fingerprint, 128) ||
      generateFingerprint(files, raw.title, raw.type),
  };
}

function assertProposalHasFiles(files: PatchFile[]) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("PROPOSAL_FILES_REQUIRED");
  }
}

function assertValidStatusTransition(
  current: ProposalStatus,
  next: ProposalStatus
) {
  if (current === next) return;

  const allowed: Record<ProposalStatus, ProposalStatus[]> = {
    pending: ["approved", "denied", "archived", "rejected"],
    approved: ["applied", "denied", "archived", "rejected"],
    applied: ["published", "archived"],
    published: ["archived"],
    denied: ["archived"],
    archived: [],
    rejected: ["archived"],
  };

  if (!allowed[current].includes(next)) {
    throw new Error(`INVALID_STATUS_TRANSITION:${current}->${next}`);
  }
}

export async function createProposal(args: {
  title?: string;
  summary?: string;
  type?: string;
  risk?: string;
  reason?: string;
  proposedBy?: string;
  source?: string;
  files: PatchFile[];
  metadata?: ProposalMetadata;
  tags?: string[];
  targetFiles?: string[];
  fingerprint?: string;
}) {
  const db = await readDb();
  const normalizedFiles = normalizeFiles(args.files || []);
  const now = Date.now();

  assertProposalHasFiles(normalizedFiles);

  const title = normalizeString(args.title, MAX_TITLE_LENGTH) || "Manual Patch";
  const type = normalizeType(args.type);
  const fingerprint =
    normalizeString(args.fingerprint, 128) ||
    generateFingerprint(normalizedFiles, title, type);

  const duplicate = db.find(
    (item) =>
      item.fingerprint === fingerprint &&
      item.archived !== true &&
      item.status !== "denied" &&
      item.status !== "rejected"
  );

  if (duplicate) {
    throw new Error(`DUPLICATE_PROPOSAL:${duplicate.id}`);
  }

  const proposal: Proposal = {
    id: crypto.randomBytes(8).toString("hex"),
    title,
    summary: normalizeString(args.summary, MAX_SUMMARY_LENGTH),
    type,
    risk: normalizeRisk(args.risk),
    reason: normalizeString(args.reason, MAX_REASON_LENGTH),
    proposedBy: normalizeString(args.proposedBy, 120) || "unknown",
    source: normalizeString(args.source, 120) || "patchStore",
    status: "pending",
    createdAt: now,
    updatedAt: now,
    files: normalizedFiles,
    archived: false,
    metadata: normalizeMetadata(args.metadata),
    tags: normalizeTags(args.tags),
    targetFiles: uniqueStrings(
      Array.isArray(args.targetFiles) && args.targetFiles.length > 0
        ? args.targetFiles
        : normalizedFiles.map((f) => f.path)
    ),
    fingerprint,
  };

  db.push(proposal);
  await writeDb(db);
  return proposal;
}

export async function listProposals() {
  const db = await readDb();
  return db
    .filter((p) => !p.archived && p.status !== "archived")
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

export async function listAllProposals() {
  const db = await readDb();
  return db.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

export async function getProposal(id: string) {
  const cleanId = String(id || "").trim().replace(/\.json$/i, "");
  if (!cleanId) return null;

  const db = await readDb();
  const fromDb = db.find((p) => p.id === cleanId);
  if (fromDb) return fromDb;

  try {
    const raw = await fs.readFile(
      path.join(PROPOSALS_DIR, `${cleanId}.json`),
      "utf8"
    );
    return normalizeStoredProposal(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function setStatus(id: string, status: string) {
  const cleanId = String(id || "").trim().replace(/\.json$/i, "");
  if (!cleanId) return null;

  const db = await readDb();

  let proposal: Proposal | null | undefined = db.find(
    (item) => item.id === cleanId
  );

  const fromLooseFile = !proposal;

  if (!proposal) {
    proposal = await getProposal(cleanId);
  }

  if (!proposal) return null;

  const now = Date.now();
  const nextStatus = normalizeStatus(status);

  assertValidStatusTransition(proposal.status, nextStatus);

  proposal.status = nextStatus;
  proposal.updatedAt = now;

  if (nextStatus === "approved") {
    proposal.approvedAt = now;
  }

  if (nextStatus === "applied") {
    proposal.appliedAt = now;
  }

  if (nextStatus === "published") {
    proposal.publishedAt = now;
  }

  if (nextStatus === "denied") {
    proposal.deniedAt = now;
  }

  if (nextStatus === "rejected") {
    proposal.rejectedAt = now;
  }

  if (nextStatus === "archived") {
    proposal.archived = true;
    proposal.archivedAt = now;
  }

  if (fromLooseFile) {
    await fs.mkdir(PROPOSALS_DIR, { recursive: true }).catch(() => {});
    await fs.writeFile(
      path.join(PROPOSALS_DIR, `${proposal.id}.json`),
      JSON.stringify(proposal, null, 2),
      "utf8"
    );
  } else {
    const index = db.findIndex((item) => item.id === proposal.id);
    if (index !== -1) {
      db[index] = proposal;
      await writeDb(db);
    } else {
      await fs.mkdir(PROPOSALS_DIR, { recursive: true }).catch(() => {});
      await fs.writeFile(
        path.join(PROPOSALS_DIR, `${proposal.id}.json`),
        JSON.stringify(proposal, null, 2),
        "utf8"
      );
    }
  }

  return proposal;
}

export async function archiveProposal(id: string) {
  const cleanId = String(id || "").trim().replace(/\.json$/i, "");
  if (!cleanId) return null;

  const db = await readDb();

  let proposal: Proposal | null | undefined = db.find(
    (item) => item.id === cleanId
  );

  const fromLooseFile = !proposal;

  if (!proposal) {
    proposal = await getProposal(cleanId);
  }

  if (!proposal) return null;

  const now = Date.now();

  if (proposal.status !== "archived") {
    assertValidStatusTransition(proposal.status, "archived");
  }

  proposal.archived = true;
  proposal.status = "archived";
  proposal.updatedAt = now;
  proposal.archivedAt = now;

  if (fromLooseFile) {
    await fs.mkdir(PROPOSALS_DIR, { recursive: true }).catch(() => {});
    await fs.writeFile(
      path.join(PROPOSALS_DIR, `${proposal.id}.json`),
      JSON.stringify(proposal, null, 2),
      "utf8"
    );
  } else {
    const index = db.findIndex((item) => item.id === proposal.id);
    if (index !== -1) {
      db[index] = proposal;
      await writeDb(db);
    }
  }

  return proposal;
}
