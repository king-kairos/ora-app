export type StrategicPlanStatus =
  | "draft"
  | "awaiting-approval"
  | "approved"
  | "proposal-generation"
  | "ready"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

export type StrategicTaskKind =
  | "analysis"
  | "types"
  | "data"
  | "api"
  | "component"
  | "page"
  | "integration"
  | "verification";

export type StrategicTaskStatus =
  | "pending"
  | "blocked"
  | "ready"
  | "proposal-created"
  | "approved"
  | "executing"
  | "completed"
  | "failed";

export type StrategicTask = {
  id: string;
  order: number;
  title: string;
  description: string;
  kind: StrategicTaskKind;
  status: StrategicTaskStatus;
  dependsOn: string[];
  targets: string[];
  proposedBy: string;
  risk: "low" | "medium" | "high";
  proposalId?: string | null;
  operationId?: string | null;
};

export type StrategicPlanHistoryItem = {
  status: StrategicPlanStatus;
  timestamp: string;
  message: string;
};

export type StrategicPlan = {
  planId: string;
  intent: string;
  branch: string | null;
  title: string;
  summary: string;
  status: StrategicPlanStatus;

  leader: string;
  team: string[];
  council: unknown;
  branchAwareness: unknown;

  risk: "low" | "medium" | "high";
  targetFiles: string[];
  tasks: StrategicTask[];

  requiresKairosApproval: true;
  sealRequired: true;
  canExecute: false;

  createdAt: string;
  updatedAt: string;
  history: StrategicPlanHistoryItem[];

  sourcePlan: {
    title: string;
    summary: string;
    steps: string[];
  };
};
