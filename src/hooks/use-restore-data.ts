"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

const RAW_DATA_KEY = "ai-analysis-rawdata";
const LIKERT_KEY = "ai-analysis-likert";

export function useRestoreData() {
  useEffect(() => {
    const state = useAppStore.getState();
    if (state.rawData) return; // already has data, skip

    try {
      const raw = localStorage.getItem(RAW_DATA_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        state.setRawData(data);
        // Restore likert columns too
        const likert = localStorage.getItem(LIKERT_KEY);
        if (likert) {
          state.setLikertColumns(JSON.parse(likert));
        }
      }
    } catch {
      // ignore
    }
  }, []);
}
