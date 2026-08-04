export type OrchestratorStage =
  | "created"
  | "validating"
  | "approving"
  | "approved"
  | "backing_up"
  | "backup_ready"
  | "backup_not_required"
  | "applying"
  | "applied"
  | "build_pending"
  | "building"
  | "build_passed"
  | "restart_pending"
  | "restarting"
  | "smoke_testing"
  | "smoke_passed"
  | "health_checking"
  | "health_passed"
  | "deploy_history"
  | "completed"
  | "failed"
  | "recovery-pending";

export type OrchestratorOperationStatus =
  | "running"
  | "completed"
  | "failed"
  | "pending-approval";

export type OrchestratorOperation = {
  operationId: string;
  proposalId: string;
  stage: OrchestratorStage;
  status: OrchestratorOperationStatus;
  createdAt: string;
  updatedAt: string;
  history: Array<{
    stage: OrchestratorStage;
    status: string;
    timestamp: string;
    message?: string;
  }>;
};
