"use client";

import { useAppStore } from "@/lib/store";
import { AlertTriangle, CheckCircle2, Check } from "lucide-react";
import { useMemo } from "react";

export function MissingHandler() {
  const rawData = useAppStore((s) => s.rawData);
  const columns = useAppStore((s) => s.columns);
  const missingStrategy = useAppStore((s) => s.missingStrategy);
  const setMissingStrategy = useAppStore((s) => s.setMissingStrategy);
  const repair = useAppStore((s) => s.repair);
  const applyFix = useAppStore((s) => s.applyFix);
  const setRepairAction = useAppStore((s) => s.setRepairAction);

  const missingSummary = useMemo(() => {
    if (!rawData) return null;
    const totalCells = rawData.rowCount * rawData.colCount;
    const totalMissing = columns.reduce((sum, c) => sum + c.missingCount, 0);
    const colsWithMissing = columns.filter((c) => c.missingCount > 0);
    return {
      totalMissing,
      totalCells,
      missingRate: totalCells > 0 ? (totalMissing / totalCells * 100).toFixed(1) : "0",
      colsWithMissing,
      completeRows: rawData.rowCount - rawData.rows.filter((r) =>
        columns.some((c) => {
          const v = r[c.name];
          return v === null || v === undefined || v === "";
        })
      ).length,
    };
  }, [rawData, columns]);

  if (!rawData || columns.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-medium text-foreground mb-1">缺失值处理</h3>
        <p className="text-[10px] text-muted-foreground">
          选择处理策略以应对数据中的缺失值
        </p>
      </div>

      {/* Summary stats */}
      {missingSummary && (
        <div className="grid grid-cols-2 gap-2">
          <div className="px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground">缺失率</p>
            <p className="text-sm font-semibold text-foreground">
              {missingSummary.missingRate}%
            </p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground">有缺失的列</p>
            <p className="text-sm font-semibold text-foreground">
              {missingSummary.colsWithMissing.length} / {columns.length}
            </p>
          </div>
        </div>
      )}

      {/* Strategy selection */}
      <div className="space-y-1.5">
        <label className="text-[11px] text-muted-foreground">处理方式</label>
        <div className="grid gap-1.5">
          {([
            { method: "listwise" as const, label: "整行删除", desc: "移除含缺失值的整行样本" },
            { method: "mean_imputation" as const, label: "均值填补", desc: "用该列均值填充缺失值" },
          ]).map((opt) => (
            <button
              key={opt.method}
              onClick={() => setMissingStrategy({ ...missingStrategy, method: opt.method })}
              className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                missingStrategy.method === opt.method
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-muted-foreground/20"
              }`}
            >
              <div className="flex items-center gap-2">
                {missingStrategy.method === opt.method ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.5} />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />
                )}
                <span className="text-xs font-medium text-foreground">{opt.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 ml-[22px]">
                {opt.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Threshold */}
      <div className="space-y-1.5">
        <label className="text-[11px] text-muted-foreground">
          最大缺失容忍度：{(missingStrategy.threshold * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="5"
          max="50"
          step="5"
          value={missingStrategy.threshold * 100}
          onChange={(e) =>
            setMissingStrategy({
              ...missingStrategy,
              threshold: Number(e.target.value) / 100,
            })
          }
          className="w-full h-1.5 rounded-full bg-secondary appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/60">
          <span>5%</span>
          <span>50%</span>
        </div>
      </div>

      {/* Column-level missing warnings */}
      {missingSummary && missingSummary.colsWithMissing.length > 0 && (
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">
            含缺失值的变量
          </label>
          <div className="max-h-[120px] overflow-y-auto space-y-0.5">
            {missingSummary.colsWithMissing.map((col) => {
              const rate = ((col.missingCount / rawData.rowCount) * 100).toFixed(0);
              const isHigh = Number(rate) > 20;
              return (
                <div
                  key={col.name}
                  className="flex items-center justify-between px-2 py-1 rounded text-[11px]"
                >
                  <div className="flex items-center gap-1.5">
                    {isHigh && (
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" strokeWidth={1.5} />
                    )}
                    <span className="text-foreground truncate max-w-[140px]">{col.name}</span>
                  </div>
                  <span className={isHigh ? "text-amber-500" : "text-muted-foreground"}>
                    {rate}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Apply fix button — only visible when repair workflow is active */}
      {repair.currentAction === "missing" && (
        <button
          onClick={() => {
            applyFix("missing");
            setRepairAction(null);
          }}
          disabled={repair.appliedFixes.missing}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            repair.appliedFixes.missing
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
              : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
          }`}
        >
          {repair.appliedFixes.missing ? (
            <><Check className="w-3.5 h-3.5" /> 已应用缺失值修复</>
          ) : (
            <>应用修复（{missingStrategy.method === "mean_imputation" ? "均值填补" : "整行删除"} · 阈值 {Math.round(missingStrategy.threshold * 100)}%）</>
          )}
        </button>
      )}
    </div>
  );
}
