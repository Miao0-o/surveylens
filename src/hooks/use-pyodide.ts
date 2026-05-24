"use client";

import { useRef, useState, useCallback } from "react";
import { StatsWorkerBridge, type StepProgress } from "@/lib/stats/worker-bridge";
import { useAppStore } from "@/lib/store";
import { compressResults } from "@/lib/ai/compressor";
import { validateResults } from "@/lib/stats/validation-engine";
import type { AnalysisStage } from "@/types";

type WorkerStatus = "unloaded" | "loading" | "ready" | "error";

const STAGE_MAP: Record<string, AnalysisStage> = {
  loading_packages: "idle",
  packages_loaded: "idle",
  reliability: "reliability",
  validity: "validity",
  efa: "efa",
  stability: "stability",
};

export function usePyodide() {
  const bridgeRef = useRef<StatsWorkerBridge | null>(null);
  const [status, setStatus] = useState<WorkerStatus>("unloaded");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [currentStage, setCurrentStage] = useState<string>("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [estimatedRemainingMs, setEstimatedRemainingMs] = useState<number | null>(null);

  const initWorker = useCallback(async () => {
    if (bridgeRef.current) return bridgeRef.current;

    setStatus("loading");
    setLoadingMessage("加载统计引擎...");

    const bridge = new StatsWorkerBridge((progress: StepProgress) => {
      setCurrentStage(progress.message);
      setElapsedMs(progress.elapsedMs);
      setEstimatedRemainingMs(progress.estimatedRemainingMs);

      // Sync to global store for center panel display
      const mappedStage = STAGE_MAP[progress.stage] ?? "idle";
      useAppStore.getState().setAnalysisStage(mappedStage);
    });

    try {
      await bridge.initialize();
      bridgeRef.current = bridge;
      setStatus("ready");
      setCurrentStage("");
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

    let bridge = bridgeRef.current;
    if (!bridge) {
      bridge = await initWorker();
    }

    // Prepare data matrix
    const data: number[][] = [];
    for (const row of rawData.rows) {
      const vec: number[] = [];
      for (const col of likertColumns) {
        const v = Number(row[col]);
        vec.push(isNaN(v) ? NaN : v);
      }
      data.push(vec);
    }

    // Run analysis with per-step progress
    const results = await bridge.runAnalysis({
      data,
      itemLabels: likertColumns,
      rotation: "varimax",
      nBootstrap: 200,
    });

    useAppStore.getState().setResults(results);

    // Validation engine
    const validation = validateResults(results);
    useAppStore.getState().setValidationReport(validation);

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
    currentStage,
    elapsedMs,
    estimatedRemainingMs,
    initWorker,
    runAnalysis,
    terminate,
  };
}
