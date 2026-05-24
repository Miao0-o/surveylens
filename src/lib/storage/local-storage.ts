// ============================================================
// localStorage Backend
// ============================================================

import type { StorageBackend } from "./types";

const PREFIX = "ai-analysis-";

export function createLocalStorageBackend(): StorageBackend {
  return {
    get<T>(key: string): T | null {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    set<T>(key: string, value: T): void {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch (e) {
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          console.warn("[Storage] Quota exceeded, attempting cleanup");
          // Remove oldest non-session keys
          const keys = this.keys().filter((k) => !k.startsWith("session-"));
          for (const oldKey of keys.slice(0, 5)) {
            this.remove(oldKey);
          }
          // Retry
          try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
          } catch {
            console.error("[Storage] Failed to write even after cleanup");
          }
        }
      }
    },

    remove(key: string): void {
      localStorage.removeItem(PREFIX + key);
    },

    keys(): string[] {
      const result: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX)) {
          result.push(k.slice(PREFIX.length));
        }
      }
      return result;
    },

    clear(): void {
      for (const key of this.keys()) {
        this.remove(key);
      }
    },

    ready(): boolean {
      try {
        localStorage.setItem("__test__", "1");
        localStorage.removeItem("__test__");
        return true;
      } catch {
        return false;
      }
    },
  };
}
