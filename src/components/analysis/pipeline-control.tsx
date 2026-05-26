"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePyodide } from "@/hooks/use-pyodide";
import { t } from "@/lib/i18n";

export function PipelineControl() {
  const pipelineState = useAppStore((s) => s.pipelineState);
  const hasData = useAppStore((s) => s.rawData !== null);
  const rawData = useAppStore((s) => s.rawData);
  const columns = useAppStore((s) => s.columns);
  const analysisMode = useAppStore((s) => s.analysisMode);
  const designConfirmed = useAppStore((s) => s.designConfirmed);
  const hasDesign = useAppStore((s) => s.researchDesign !== null && (s.researchDesign?.outcomeVariables?.length ?? 0) > 0);

  const hasAnalyzable = hasData && (rawData?.rowCount ?? 0) > 0 && (columns.some(c => c.type === "numeric" || c.type === "likert") || (rawData?.headers?.length ?? 0) > 0);
  const aiMode = useAppStore((s) => s.aiMode);
  const reset = useAppStore((s) => s.reset);
  const lang = useAppStore((s) => s.reportLanguage);
  const triggerReRun = useAppStore((s) => s.triggerReRun);
  const { status: workerStatus, loadingMessage, runAnalysis } = usePyodide();
  const [localError, setLocalError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const runningRef = useRef(false);

  // Watch for re-run request from dashboard
  useEffect(() => {
    if (triggerReRun > 0 && !runningRef.current) {
      doRun();
    }
  }, [triggerReRun]);

  const needsDesign = analysisMode === "custom";
  const canRun = hasData && hasAnalyzable && pipelineState === "idle" && !runningRef.current
    && (!needsDesign || (hasDesign && designConfirmed));
  const isRunning = pipelineState === "processing" || pipelineState === "ai_processing" || runningRef.current;
  const isWorkerLoading = workerStatus === "loading";

  const doRun = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setLocalError(null);
    useAppStore.getState().touchActivity();
    const state = useAppStore.getState();
    const prev = state.results;
    if (prev) state.setPreviousResults(prev);
    state.startProcessing("analysis");
    try {
      await runAnalysis();
      useAppStore.getState().completeProcessing();
      useAppStore.getState().resetRepair();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "分析执行失败";
      setLocalError(msg);
      useAppStore.getState().failProcessing(msg);
    } finally {
      runningRef.current = false;
    }
  }, [runAnalysis]);

  const handleRun = useCallback(async () => {
    if (!canRun || runningRef.current) return;
    await doRun();
  }, [canRun, doRun]);

  const handleReset = () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    reset();
    setShowResetConfirm(false);
    setLocalError(null);
  };

  return (
    <div className="space-y-2">
      <button
        data-analyze-btn
        disabled={!canRun || isWorkerLoading}
        onClick={handleRun}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium
          hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {isRunning || isWorkerLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {isWorkerLoading ? loadingMessage : "分析中..."}
          </>
        ) : (
          <>
            <Play className="w-4 h-4" fill="currentColor" />
            {t("btn.analyze", lang)}
          </>
        )}
      </button>

      {pipelineState === "completed" && (
        <div className="space-y-1.5">
          <button onClick={doRun}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium border border-primary/20 hover:bg-primary/20 transition-colors">
            <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
            {t("btn.analyze", lang)}
          </button>
          {showResetConfirm ? (
            <div className="flex gap-1.5">
              <button onClick={handleReset}
                className="flex-1 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium hover:bg-destructive/20 transition-colors">
                {t("btn.confirmReset", lang)}
              </button>
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                {t("btn.cancel", lang)}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
              重置所有数据
            </button>
          )}
        </div>
      )}

      {localError && (
        <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-red-50 border border-red-100">
          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-[11px] text-red-600">{localError}</p>
        </div>
      )}
    </div>
  );
}
