"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { runAIInterpretation } from "@/lib/ai/client";
import { compressResults } from "@/lib/ai/compressor";
import { guardAIOutput } from "@/lib/ai/output-guard";
import type { AIStreamingStage } from "@/types";

export function useAI() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const setStreaming = useAppStore((s) => s.setAIStreamingStage);

  const runAI = useCallback(async () => {
    const state = useAppStore.getState();
    const { apiKey, results, researchGoal, aiMode } = state;

    if (!apiKey?.startsWith("sk-ant")) {
      setError("请先配置 API Key");
      setStatus("error");
      return;
    }

    if (!results) {
      setError("请先完成统计分析");
      setStatus("error");
      return;
    }

    // Check cache: don't re-run AI for same analysis session
    const cached = useAppStore.getState().checkAICache();
    if (cached) {
      useAppStore.getState().setAIResults(cached);
      setStatus("done");
      return;
    }

    useAppStore.getState().setPipelineState("ai_processing");
    setStatus("loading");
    setError(null);

    // Progressive streaming stages
    const streamStages: AIStreamingStage[] = [
      "interpreting_reliability",
      "interpreting_validity",
      "diagnosing",
      "generating_apa",
    ];

    try {
      const compressed = compressResults(results, researchGoal);

      // Simulate progressive stages (Claude API call is single-shot,
      // but we give the user visual feedback)
      for (const stage of streamStages) {
        setStreaming(stage);
        await new Promise((r) => setTimeout(r, 600));
      }

      const state = useAppStore.getState();
      const validation = state.validationReport;
      const lang = useAppStore.getState().reportLanguage;
      const rawAIResults = await runAIInterpretation(apiKey, compressed, validation, lang);

      // Run output guard (Layer 5 — non-AI final check)
      const postState = useAppStore.getState();
      const postValidation = postState.validationReport;
      if (postValidation && postState.results) {
        const guardResult = guardAIOutput(rawAIResults, postState.results, postValidation);
        if (!guardResult.passed) {
          console.warn("[OutputGuard] AI output flagged:", guardResult.violations);
        }
        useAppStore.getState().setAIResults(guardResult.sanitized);
      } else {
        useAppStore.getState().setAIResults(rawAIResults);
      }
      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI 解读失败";
      setError(msg);
      setStatus("error");
      useAppStore.getState().setAIStreamingStage("error");
      useAppStore.getState().setPipelineState("completed");
    }
  }, [setStreaming]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    useAppStore.getState().clearAICache();
  }, []);

  return {
    status,
    error,
    runAI,
    reset,
  };
}
