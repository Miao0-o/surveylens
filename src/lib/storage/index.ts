// ============================================================
// Storage Layer — Barrel Export + Singleton Factory
// ============================================================

import { createLocalStorageBackend } from "./local-storage";
import { SessionManager } from "./session-manager";
import type { StorageBackend } from "./types";

export { SessionManager } from "./session-manager";
export type { StorageBackend, SessionSnapshot, SessionPayload } from "./types";

let _manager: SessionManager | null = null;

/** Get or create the singleton SessionManager */
export function getSessionManager(storage?: StorageBackend): SessionManager {
  if (!_manager) {
    _manager = new SessionManager(storage ?? createLocalStorageBackend());
  }
  return _manager;
}

/** Swap storage backend at runtime (e.g. localStorage → IndexedDB) */
export function setStorageBackend(backend: StorageBackend): void {
  const oldManager = _manager;
  _manager = new SessionManager(backend);
  // Copy existing session if any
  if (oldManager?.hasActiveSession()) {
    const snap = oldManager.getSnapshot();
    if (snap) {
      _manager.saveSession(snap.payload);
    }
  }
}
