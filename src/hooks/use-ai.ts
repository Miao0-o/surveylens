"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { runAIInterpretation } from "@/lib/ai/client";
import { compressResults } from "@/lib/ai/compressor";
import type { AIResults } from "@/types";

type AIStatus = "idle" | "loading" | "done" | "error";

export function useAI() {
  const [status, setStatus] = useState<AIStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const runAI = useCallback(async () => {
    const state = useAppStore.getState();
    const { apiKey, results, researchGoal } = state;

    if (!apiKey || !apiKey.startsWith("sk-ant")) {
      setError("请先配置有效的 Claude API Key");
      setStatus("error");
      return;
    }

    if (!results) {
      setError("请先完成统计分析");
      setStatus("error");
      return;
    }

    // Update global state
    const store = useAppStore.getState();
    store.setPipelineState("ai_processing");

    setStatus("loading");
    setError(null);

    try {
      // Compress results for AI consumption
      const compressed = compressResults(results, researchGoal);

      // Call Claude API via proxy
      const aiResults = await runAIInterpretation(apiKey, compressed);

      // Store AI results
      useAppStore.getState().setAIResults(aiResults);
      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI 解读失败";
      setError(msg);
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return {
    status,
    error,
    runAI,
    reset,
  };
}
