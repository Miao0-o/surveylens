"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { idbRemove } from "@/lib/storage/idb-storage";

const RAW_DATA_KEY = "ai-analysis-rawdata";
const LIKERT_KEY = "ai-analysis-likert";
const TTL_MS = 10 * 60 * 1000;

let _timer: ReturnType<typeof setTimeout> | null = null;

function resetGlobalTimer() {
  if (_timer) clearTimeout(_timer);
  const store = useAppStore.getState();
  if (!store.rawData) return;
  _timer = setTimeout(() => {
    idbRemove(RAW_DATA_KEY);
    idbRemove(LIKERT_KEY);
    useAppStore.getState().reset();
  }, TTL_MS);
}

export function useAutoExpire() {
  const rawData = useAppStore((s) => s.rawData);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    resetGlobalTimer();
  }, [rawData]);

  useEffect(() => {
    const handler = () => resetGlobalTimer();
    const events = ["click", "keydown", "scroll", "touchstart"];
    for (const ev of events) window.addEventListener(ev, handler, { passive: true });
    return () => {
      for (const ev of events) window.removeEventListener(ev, handler);
    };
  }, []);
}
