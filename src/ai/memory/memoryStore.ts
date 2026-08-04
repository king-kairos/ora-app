// src/ai/memory/memoryStore.ts

export type ModuleId =
  | "kaerliana"
  | "rafael"
  | "arturo"
  | "orion"
  | "lucian"
  | "ignis";

export type MemoryRole = "user" | "assistant";

export type MemoryRecord = {
  id: string;
  ts: string; // ISO timestamp
  module: ModuleId;
  role: MemoryRole;
  content: string;
  meta?: Record<string, any>;
};

export type MemoryRecordInput = Omit<MemoryRecord, "id"> & {
  id?: string;
};

export type MemorySearchResult = {
  items: MemoryRecord[];
  scanned: number;
  returned: number;
};

export interface MemoryStore {
  save(record: MemoryRecordInput | MemoryRecord): Promise<MemoryRecord>;
  recent(limit?: number): Promise<MemoryRecord[]>;
  search(query: string, limit?: number): Promise<MemorySearchResult>;
}
