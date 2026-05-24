"use client";

import { useCallback, useRef, useState } from "react";
import { Play, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { usePyodide } from "@/hooks/use-pyodide";

export function PipelineControl() {
  const pipelineState = useAppStore((s) => s.pipelineState);
  const hasData = useAppStore((s) => s.rawData !== null);
  const hasLikert = useAppStore((s) => s.likertColumns.length > 0);
  const reset = useAppStore((s) => s.reset);
  const startProcessing = useAppStore((s) => s.startProcessing);
  const completeProcessing = useAppStore((s) => s.completeProcessing);
  const failProcessing = useAppStore((s) => s.failProcessing);

  const { status: workerStatus, loadingMessage, runAnalysis } = usePyodide();
  const [localError, setLocalError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const runningRef = useRef(false);

  const canRun = hasData && hasLikert && pipelineState === "idle" && !runningRef.current;
  const isRunning =
    pipelineState === "processing" || pipelineState === "ai_processing" || runningRef.current;
  const isWorkerLoading = workerStatus === "loading";

  const handleRun = useCallback(async () => {
    if (!canRun || runningRef.current) return;
    runningRef.current = true;
    setLocalError(null);
    startProcessing("analysis");

    try {
      await runAnalysis();
      completeProcessing();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "分析执行失败";
      setLocalError(msg);
      failProcessing(msg);
    } finally {
      runningRef.current = false;
    }
  }, [canRun, startProcessing, runAnalysis, completeProcessing, failProcessing]);

  const handleReset = () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    reset();
    setShowResetConfirm(false);
    setLocalError(null);
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-2">
      {/* Run button */}
      <button
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
            开始分析
          </>
        )}
      </button>

      {/* Reset button */}
      {pipelineState === "completed" && (
        <div className="space-y-1.5">
          {showResetConfirm ? (
            <div className="flex gap-1.5">
              <button
                onClick={handleReset}
                className="flex-1 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium
                  hover:bg-destructive/20 transition-colors"
              >
                确认重置
              </button>
              <button
                onClick={cancelReset}
                className="flex-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground
                  hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground
                hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
              重置分析
            </button>
          )}
        </div>
      )}

      {/* Error display */}
      {localError && (
        <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-red-50 border border-red-100">
          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-[11px] text-red-600">{localError}</p>
        </div>
      )}
    </div>
  );
}
