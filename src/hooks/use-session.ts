"use client";

// ============================================================
// useSession — React hook for session persistence
// Handles: auto-save, activity tracking, expire detection
// ============================================================

import { useEffect, useCallback, useRef, useState } from "react";
import { getSessionManager } from "@/lib/storage";
import type { SessionPayload } from "@/lib/storage/types";
import { useAppStore } from "@/lib/store";

export function useSession() {
  const [remainingLabel, setRemainingLabel] = useState("");
  const [hasSavedState, setHasSavedState] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const manager = getSessionManager();

  // ---- Save: serialize current app state ----
  const save = useCallback(() => {
    const state = useAppStore.getState();
    const payload: SessionPayload = {
      rawData: state.rawData,
      columns: state.columns,
      researchDesign: state.researchDesign,
      likertColumns: state.likertColumns,
      dimensions: state.dimensions,
      analysisMode: state.analysisMode,
      results: state.results,
      aiResults: state.aiResults,
    };
    manager.saveSession(payload);
    setHasSavedState(true);
  }, [manager]);

  // ---- Load: restore app state from session ----
  const load = useCallback((): boolean => {
    const snapshot = manager.loadSession();
    if (!snapshot) return false;

    const p = snapshot.payload;
    const state = useAppStore.getState();
    if (p.rawData) state.setRawData(p.rawData as Parameters<typeof state.setRawData>[0]);
    if (p.likertColumns?.length) state.setLikertColumns(p.likertColumns as string[]);
    if (p.analysisMode) useAppStore.getState().setAnalysisMode(p.analysisMode as "auto" | "guided" | "expert");
    if (p.researchDesign) useAppStore.getState().setResearchDesign(p.researchDesign as Parameters<typeof state.setResearchDesign>[0]);
    // Note: columns, dimensions, results, aiResults are not restored
    // to keep things simple — they would need recomputation

    setHasSavedState(true);
    return true;
  }, [manager]);

  // ---- Update activity on any interaction ----
  const touch = useCallback(() => {
    manager.updateActivity();
  }, [manager]);

  // ---- Auto-save on every store change ----
  useEffect(() => {
    const unsub = useAppStore.subscribe(() => {
      const s = useAppStore.getState();
      // Only auto-save if there's meaningful data
      if (s.rawData || s.results) {
        save();
      }
    });
    return unsub;
  }, [save]);

  // ---- Countdown tick ----
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setRemainingLabel(manager.remainingLabel());
      if (manager.isExpired()) {
        setHasSavedState(false);
      }
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [manager]);

  // ---- Track user activity globally ----
  useEffect(() => {
    const events = ["click", "keydown", "scroll", "input", "change"];
    const handler = () => touch();
    for (const ev of events) {
      window.addEventListener(ev, handler, { passive: true });
    }
    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, handler);
      }
    };
  }, [touch]);

  // ---- On mount: try to restore ----
  useEffect(() => {
    const restored = load();
    if (restored) {
      setHasSavedState(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    save,
    load,
    touch,
    remainingLabel,
    hasSavedState,
    isExpired: manager.isExpired(),
  };
}
