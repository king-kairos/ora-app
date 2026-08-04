import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type {
  OrchestratorOperation,
  OrchestratorStage,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "orchestrator");

function operationFile(operationId: string) {
  return path.join(DATA_DIR, `${operationId}.json`);
}

export async function createOperation(
  proposalId: string
): Promise<OrchestratorOperation> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const now = new Date().toISOString();
  const operationId = `operation-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}`;

  const operation: OrchestratorOperation = {
    operationId,
    proposalId,
    stage: "created",
    status: "running",
    createdAt: now,
    updatedAt: now,
    history: [
      {
        stage: "created",
        status: "running",
        timestamp: now,
        message: "Operación creada bajo control del Orquestador Central.",
      },
    ],
  };

  await fs.writeFile(
    operationFile(operationId),
    JSON.stringify(operation, null, 2),
    "utf8"
  );

  return operation;
}

export async function readOperation(
  operationId: string
): Promise<OrchestratorOperation | null> {
  try {
    const raw = await fs.readFile(operationFile(operationId), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function updateOperation(
  operationId: string,
  stage: OrchestratorStage,
  status: OrchestratorOperation["status"],
  message?: string
): Promise<OrchestratorOperation | null> {
  const operation = await readOperation(operationId);
  if (!operation) return null;

  const now = new Date().toISOString();

  operation.stage = stage;
  operation.status = status;
  operation.updatedAt = now;
  operation.history.push({
    stage,
    status,
    timestamp: now,
    message,
  });

  await fs.writeFile(
    operationFile(operationId),
    JSON.stringify(operation, null, 2),
    "utf8"
  );

  return operation;
}
