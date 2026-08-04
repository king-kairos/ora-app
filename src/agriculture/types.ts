export type AgricultureStatus = {
  ok: boolean;
  branch: string;
  status: string;
  createdBy?: string;
  createdAt?: string;
};

export type AgricultureEvent = {
  id: string;
  title: string;
  note: string;
  createdAt: string;
};

export type AgricultureModule = {
  id: string;
  label: string;
  status: "pending" | "active" | "paused";
};
