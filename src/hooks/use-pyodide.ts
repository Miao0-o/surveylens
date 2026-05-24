"use client";

// ============================================================
// React Hook for Pyodide Worker lifecycle management
// ============================================================

import { useRef, useState, useCallback } from "react";
import { StatsWorkerBridge } from "@/lib/stats/worker-bridge";
import { useAppStore } from "@/lib/store";
import { compressResults } from "@/lib/ai/compressor";
import { createEmptyResults } from "@/lib/schema";
import type { AnalysisResults } from "@/types";

type WorkerStatus = "unloaded" | "loading" | "ready" | "error";

export function usePyodide() {
  const bridgeRef = useRef<StatsWorkerBridge | null>(null);
  const [status, setStatus] = useState<WorkerStatus>("unloaded");
  const [loadingMessage, setLoadingMessage] = useState("");

  const store = useAppStore;

  const initWorker = useCallback(async () => {
    if (bridgeRef.current) return bridgeRef.current;

    setStatus("loading");
    setLoadingMessage("正在加载统计引擎...");

    const bridge = new StatsWorkerBridge((stage, message) => {
      setLoadingMessage(message);
    });

    try {
      await bridge.initialize();
      bridgeRef.current = bridge;
      setStatus("ready");
      return bridge;
    } catch (err) {
      setStatus("error");
      throw err;
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    const state = useAppStore.getState();
    const { rawData, likertColumns } = state;

    if (!rawData) throw new Error("No data to analyze");

    // Initialize worker if needed
    let bridge = bridgeRef.current;
    if (!bridge) {
      bridge = await initWorker();
    }

    // Prepare data matrix (Likert columns only, rows as samples)
    const data: number[][] = [];
    for (const row of rawData.rows) {
      const vec: number[] = [];
      for (const col of likertColumns) {
        const v = Number(row[col]);
        vec.push(isNaN(v) ? NaN : v);
      }
      data.push(vec);
    }

    // Run analysis via Pyodide worker
    const results = await bridge.runAnalysis({
      data,
      itemLabels: likertColumns,
      rotation: "varimax",
      nBootstrap: 200,
    });

    // Store results
    useAppStore.getState().setResults(results);

    // Generate AI compressed input
    const compressed = compressResults(results, state.researchGoal);

    return { results, compressed };
  }, [initWorker]);

  const terminate = useCallback(() => {
    bridgeRef.current?.terminate();
    bridgeRef.current = null;
    setStatus("unloaded");
  }, []);

  return {
    status,
    loadingMessage,
    initWorker,
    runAnalysis,
    terminate,
  };
}
