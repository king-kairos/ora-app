import fs from "fs";
import path from "path";

type ProposalFile = {
  id: string;
  origin?: string;
  type?: string;
  title?: string;
  summary?: string;
  target?: string;
  targetFile?: string;
  targetFiles?: string[];
  risk?: string;
  status?: string;
  timestamp?: string;
  content?: string;
  files?: Array<{
    path: string;
    content?: string;
    delete?: boolean;
  }>;
};

type ApplyPatchResult = {
  ok: boolean;
  message: string;
  proposalId?: string;
  target?: string;
  backupPath?: string;
  historyPath?: string;
};

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function writeJsonFile(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}_${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}`;
}

function resolveTarget(proposal: ProposalFile): string | null {
  if (proposal?.target && proposal.target !== "N/D") {
    return String(proposal.target).trim();
  }

  if (proposal?.targetFile && proposal.targetFile !== "N/D") {
    return String(proposal.targetFile).trim();
  }

  if (Array.isArray(proposal?.targetFiles) && proposal.targetFiles.length > 0) {
    const first = String(proposal.targetFiles[0] || "").trim();
    if (first && first !== "N/D") return first;
  }

  if (Array.isArray(proposal?.files) && proposal.files.length > 0) {
    const first = String(proposal.files[0]?.path || "").trim();
    if (first) return first;
  }

  return null;
}

function resolveContent(proposal: ProposalFile): string | null {
  if (typeof proposal?.content === "string" && proposal.content.trim() !== "") {
    return proposal.content;
  }

  if (Array.isArray(proposal?.files) && proposal.files.length > 0) {
    const firstFile = proposal.files[0];
    if (
      firstFile &&
      typeof firstFile.content === "string" &&
      firstFile.content.trim() !== ""
    ) {
      return firstFile.content;
    }
  }

  return null;
}

export function applyProposalPatch(proposalId: string): ApplyPatchResult {
  try {
    const root = process.cwd();

    const proposalsDir = path.join(root, "ora-data", "proposals");
    const backupsDir = path.join(root, "ora-data", "backups");
    const historyDir = path.join(root, "ora-data", "history");

    ensureDir(proposalsDir);
    ensureDir(backupsDir);
    ensureDir(historyDir);

    const proposalPath = path.join(proposalsDir, `${proposalId}.json`);

    if (!fs.existsSync(proposalPath)) {
      return {
        ok: false,
        message: `No existe la propuesta ${proposalId}`,
      };
    }

    const proposal = readJsonFile<ProposalFile>(proposalPath);

    const resolvedTarget = resolveTarget(proposal);
    if (!resolvedTarget) {
      return {
        ok: false,
        message: `La propuesta ${proposalId} no tiene target válido`,
      };
    }

    const resolvedContent = resolveContent(proposal);
    if (!resolvedContent) {
      return {
        ok: false,
        message: `La propuesta ${proposalId} no tiene content para aplicar`,
      };
    }

    const targetPath = path.join(root, resolvedTarget);
    const targetDir = path.dirname(targetPath);

    ensureDir(targetDir);

    const targetExists = fs.existsSync(targetPath);
    const previousContent = targetExists
      ? fs.readFileSync(targetPath, "utf8")
      : "";

    const backupFileName = `${proposalId}__${nowStamp()}__${resolvedTarget.replace(/[\/\\]/g, "__")}.bak`;
    const backupPath = path.join(backupsDir, backupFileName);

    fs.writeFileSync(backupPath, previousContent, "utf8");
    fs.writeFileSync(targetPath, resolvedContent, "utf8");

    proposal.status = "applied";
    writeJsonFile(proposalPath, proposal);

    const historyRecord = {
      proposalId: proposal.id || proposalId,
      title: proposal.title || "Sin título",
      summary: proposal.summary || "",
      origin: proposal.origin || "unknown",
      target: resolvedTarget,
      risk: proposal.risk || "unknown",
      appliedAt: new Date().toISOString(),
      backupPath,
      targetPath,
    };

    const historyPath = path.join(
      historyDir,
      `${proposal.id || proposalId}__${nowStamp()}.json`
    );

    writeJsonFile(historyPath, historyRecord);

    return {
      ok: true,
      message: `Parche aplicado correctamente a ${resolvedTarget}`,
      proposalId: proposal.id || proposalId,
      target: resolvedTarget,
      backupPath,
      historyPath,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Error desconocido aplicando parche",
    };
  }
}
