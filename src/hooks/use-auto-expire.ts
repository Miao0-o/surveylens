"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { idbRemove } from "@/lib/storage/idb-storage";

const RAW_DATA_KEY = "ai-analysis-rawdata";
const LIKERT_KEY = "ai-analysis-likert";
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export function useAutoExpire() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasData = useAppStore((s) => s.rawData !== null);

  const clearExpired = () => {
    idbRemove(RAW_DATA_KEY);
    idbRemove(LIKERT_KEY);
    useAppStore.getState().reset();
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hasData) {
      timerRef.current = setTimeout(clearExpired, TTL_MS);
    }
  };

  useEffect(() => {
    resetTimer();

    const events = ["click", "keydown", "scroll", "touchstart", "input", "change"];
    const handler = () => resetTimer();
    for (const ev of events) {
      window.addEventListener(ev, handler, { passive: true });
    }
    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, handler);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasData]);

  // Restart timer when data changes
  useEffect(() => {
    resetTimer();
  }, [hasData]);
}
