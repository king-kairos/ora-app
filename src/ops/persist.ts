import fs from "fs";
import path from "path";

type OpFile = { path: string; content: string };

export type ApprovedOp = {
  id: string;
  title?: string;
  description?: string;
  files?: OpFile[];
  status?: string;
  createdAt?: string;
  approvedAt?: string;
};

function projectRoot(): string {
  // Mantiene compatibilidad con tu banner de PROJECT_ROOT
  return process.env.PROJECT_ROOT || process.cwd();
}

function opsDir(): string {
  return path.join(projectRoot(), "ops");
}

function opsLogPath(): string {
  return path.join(opsDir(), "ops.log.json");
}

export function ensureOpsLog(): void {
  const dir = opsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const p = opsLogPath();
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, "[]\n", "utf8");
    return;
  }

  // Si existe pero está dañado, lo repara sin romper el server
  try {
    const txt = fs.readFileSync(p, "utf8").trim() || "[]";
    const parsed = JSON.parse(txt);
    if (!Array.isArray(parsed)) throw new Error("ops.log.json no es array");
  } catch {
    fs.writeFileSync(p, "[]\n", "utf8");
  }
}

export function appendApprovedOp(op: ApprovedOp & { approvedBy?: string }): void {
  ensureOpsLog();
  const p = opsLogPath();

  let arr: any[] = [];
  try {
    arr = JSON.parse(fs.readFileSync(p, "utf8") || "[]");
    if (!Array.isArray(arr)) arr = [];
  } catch {
    arr = [];
  }

  const entry = {
    kind: "approved_op",
    id: op.id,
    title: op.title ?? "",
    description: op.description ?? "",
    files: op.files ?? [],
    createdAt: op.createdAt ?? "",
    approvedAt: op.approvedAt ?? new Date().toISOString(),
    approvedBy: op.approvedBy ?? "",
  };

  arr.push(entry);
  fs.writeFileSync(p, JSON.stringify(arr, null, 2) + "\n", "utf8");
}
