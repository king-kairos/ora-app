export type SecurityStatus = {
  ok: boolean;
  branch: string;
  status: string;
  createdBy?: string;
  createdAt?: string;
};

export type SecurityEvent = {
  id: string;
  title: string;
  note: string;
  createdAt: string;
};

export type SecurityModule = {
  id: string;
  label: string;
  status: "pending" | "active" | "paused";
};
