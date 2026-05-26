"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";

const INACTIVITY_MS = 15 * 60 * 1000; // 15 minutes
const COUNTDOWN_S = 60;
const CHECK_INTERVAL = 10000; // check every 10s

export function InactivityGuard() {
  const hasData = useAppStore((s) => s.rawData !== null || s.results !== null);
  const lastActivityAt = useAppStore((s) => s.lastActivityAt);
  const touchActivity = useAppStore((s) => s.touchActivity);
  const clearSession = useAppStore((s) => s.clearAnalysisSession);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_S);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = useCallback(() => {
    setShowWarning(false);
    setCountdown(COUNTDOWN_S);
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    clearSession();
  }, [clearSession]);

  const extendSession = useCallback(() => {
    setShowWarning(false);
    setCountdown(COUNTDOWN_S);
    if (countdownRef.current) clearInterval(countdownRef.current);
    touchActivity();
  }, [touchActivity]);

  // Activity listener
  useEffect(() => {
    const onActivity = () => touchActivity();
    const events = ["mousedown", "keydown", "scroll", "touchstart", "focus"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onActivity));
  }, [touchActivity]);

  // Inactivity check
  useEffect(() => {
    if (!hasData) return;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - useAppStore.getState().lastActivityAt;
      if (elapsed >= INACTIVITY_MS && !showWarning) {
        setShowWarning(true);
        setCountdown(COUNTDOWN_S);
      }
    }, CHECK_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hasData, showWarning]);

  // Countdown
  useEffect(() => {
    if (!showWarning) return;
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearAll();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [showWarning, clearAll]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4 shadow-xl">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          检测到长时间无操作
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          为保护隐私，分析数据将在{" "}
          <span className="font-bold text-destructive">{countdown} 秒</span>
          {" "}后自动清除。
        </p>
        <div className="flex gap-2">
          <button
            onClick={extendSession}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            继续会话
          </button>
          <button
            onClick={clearAll}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            立即清除
          </button>
        </div>
      </div>
    </div>
  );
}
