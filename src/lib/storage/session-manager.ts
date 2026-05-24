// ============================================================
// Session Manager — Pure logic, no React dependency
// Rolling inactivity-based session with save/load/expire/cleanup
// ============================================================

import type { StorageBackend, SessionSnapshot, SessionPayload } from "./types";

const SESSION_KEY = "session-current";
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_VERSION = 1;

interface SessionConfig {
  ttlMs?: number;
  autoSaveIntervalMs?: number;
}

export class SessionManager {
  private storage: StorageBackend;
  private ttlMs: number;
  private autoSaveIntervalMs: number;
  private currentSnapshot: SessionSnapshot | null = null;
  private activityTimer: ReturnType<typeof setTimeout> | null = null;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private onExpire: (() => void) | null = null;

  constructor(storage: StorageBackend, config: SessionConfig = {}) {
    this.storage = storage;
    this.ttlMs = config.ttlMs ?? DEFAULT_TTL_MS;
    this.autoSaveIntervalMs = config.autoSaveIntervalMs ?? 30_000; // auto-save every 30s
  }

  /** Register callback when session expires */
  onExpired(cb: () => void): void {
    this.onExpire = cb;
  }

  /** Save current app state as session snapshot */
  saveSession(payload: SessionPayload): void {
    const now = Date.now();
    const snapshot: SessionSnapshot = {
      id: this.currentSnapshot?.id ?? this.generateId(),
      createdAt: this.currentSnapshot?.createdAt ?? now,
      lastActivityAt: now,
      expiresAt: now + this.ttlMs,
      version: SESSION_VERSION,
      payload,
    };

    this.storage.set<SessionSnapshot>(SESSION_KEY, snapshot);
    this.currentSnapshot = snapshot;
    this.resetActivityTimer();
  }

  /** Load persisted session. Returns null if expired or not found. */
  loadSession(): SessionSnapshot | null {
    const snapshot = this.storage.get<SessionSnapshot>(SESSION_KEY);
    if (!snapshot) return null;

    if (snapshot.version !== SESSION_VERSION) {
      this.destroySession();
      return null;
    }

    if (this.isExpired(snapshot)) {
      this.destroySession();
      return null;
    }

    this.currentSnapshot = snapshot;
    this.resetActivityTimer();
    this.startAutoSave();
    return snapshot;
  }

  /** Update last activity timestamp — call on any user interaction */
  updateActivity(): void {
    if (!this.currentSnapshot) return;
    const now = Date.now();
    this.currentSnapshot.lastActivityAt = now;
    this.currentSnapshot.expiresAt = now + this.ttlMs;
    this.storage.set(SESSION_KEY, this.currentSnapshot);
    this.resetActivityTimer();
  }

  /** Check if a snapshot has expired */
  isExpired(snapshot?: SessionSnapshot): boolean {
    const s = snapshot ?? this.currentSnapshot;
    if (!s) return false;
    return Date.now() > s.expiresAt;
  }

  /** Remaining time in milliseconds */
  remainingMs(): number {
    if (!this.currentSnapshot) return 0;
    return Math.max(0, this.currentSnapshot.expiresAt - Date.now());
  }

  /** Remaining time as human-readable string */
  remainingLabel(): string {
    const ms = this.remainingMs();
    if (ms <= 0) return "已过期";
    const mins = Math.floor(ms / 60_000);
    const secs = Math.floor((ms % 60_000) / 1000);
    if (mins > 0) return `${mins} 分 ${secs} 秒`;
    return `${secs} 秒`;
  }

  /** Destroy session and clean up timers */
  destroySession(): void {
    this.storage.remove(SESSION_KEY);
    this.currentSnapshot = null;
    this.clearTimers();
  }

  /** Auto-cleanup: remove all expired sessions */
  cleanup(): void {
    const keys = this.storage.keys();
    for (const key of keys) {
      if (key.startsWith("session-") || key === SESSION_KEY) {
        const snap = this.storage.get<SessionSnapshot>(key);
        if (snap && Date.now() > snap.expiresAt) {
          this.storage.remove(key);
        }
      }
    }
  }

  /** Start auto-save interval */
  startAutoSave(): void {
    this.stopAutoSave();
    this.autoSaveTimer = setInterval(() => {
      if (this.currentSnapshot && !this.isExpired()) {
        this.storage.set(SESSION_KEY, this.currentSnapshot);
      }
    }, this.autoSaveIntervalMs);
  }

  /** Stop auto-save */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /** Check if a session currently exists */
  hasActiveSession(): boolean {
    return this.currentSnapshot !== null && !this.isExpired();
  }

  getSnapshot(): SessionSnapshot | null {
    return this.currentSnapshot;
  }

  // ---- Private ----

  private generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private resetActivityTimer(): void {
    if (this.activityTimer) clearTimeout(this.activityTimer);
    const remaining = this.remainingMs();
    if (remaining > 0) {
      this.activityTimer = setTimeout(() => {
        this.onExpire?.();
      }, remaining);
    }
  }

  private clearTimers(): void {
    if (this.activityTimer) clearTimeout(this.activityTimer);
    this.stopAutoSave();
  }
}
