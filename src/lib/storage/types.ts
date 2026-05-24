// ============================================================
// Storage Abstraction Layer
// Swappable backend: localStorage ↔ IndexedDB ↔ future
// ============================================================

/** Generic storage interface — implement for any backend */
export interface StorageBackend {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  keys(): string[];
  clear(): void;
  /** Whether this backend is ready to use (e.g. IndexedDB async init) */
  ready(): boolean;
}

/** Session snapshot persisted to storage */
export interface SessionSnapshot {
  id: string;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  version: number;
  payload: SessionPayload;
}

export interface SessionPayload {
  rawData: unknown | null;
  columns: unknown[];
  researchDesign: unknown | null;
  likertColumns: string[];
  dimensions: unknown[];
  analysisMode: string;
  results: unknown | null;
  aiResults: unknown | null;
}
