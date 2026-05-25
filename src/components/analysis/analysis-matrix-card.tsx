"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { runDiagnostics } from "@/lib/analysis/diagnostic-engine";
import { generateMatrix } from "@/lib/analysis/analysis-matrix";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export function AnalysisMatrixCard() {
  const columns = useAppStore((s) => s.columns);
  const results = useAppStore((s) => s.results);
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";

  const report = useMemo(() => runDiagnostics(columns, results), [columns, results]);
  const sampleSize = results?.meta.sampleSize ?? (columns.length > 0 ? Math.max(...columns.map((c) => c.uniqueValues + c.missingCount)) : 0);
  const matrix = useMemo(() => generateMatrix(report, sampleSize), [report, sampleSize]);

  if (columns.length === 0) return null;

  const items = [
    { key: "descriptive_statistics", label: en ? "Descriptive" : "描述统计", ...matrix.descriptive_statistics },
    { key: "correlation_analysis", label: en ? "Correlation" : "相关分析", ...matrix.correlation_analysis },
    { key: "regression_analysis", label: en ? "Regression" : "回归分析", ...matrix.regression_analysis },
    { key: "factor_analysis", label: en ? "Factor Analysis" : "因子分析", ...matrix.factor_analysis },
  ];

  return (
    <div className="px-4 py-3 rounded-xl bg-card border border-border space-y-2">
      <p className="text-xs font-medium text-foreground">{en ? "Analysis Readiness Matrix" : "分析可行性矩阵"}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2 text-[10px]">
            {item.icon === "green" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={2} />
              : item.icon === "yellow" ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" strokeWidth={1.5} />
              : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" strokeWidth={1.5} />}
            <span className={`font-medium w-16 shrink-0 ${item.icon === "green" ? "text-emerald-700" : item.icon === "yellow" ? "text-amber-700" : "text-red-600"}`}>
              {en ? (item.status === "allowed" ? "Allowed" : item.status === "caution" ? "Caution" : "Blocked") : (item.status === "allowed" ? "可用" : item.status === "caution" ? "谨慎" : "阻止")}
            </span>
            <span className="text-foreground">{item.label}</span>
            <span className="text-muted-foreground/60 ml-auto text-right max-w-[180px] truncate">{item.reason}</span>
          </div>
        ))}
      </div>
      {matrix.overall_summary.key_blockers.length > 0 && (
        <p className="text-[10px] text-amber-600">{matrix.overall_summary.recommendation}</p>
      )}
    </div>
  );
}
