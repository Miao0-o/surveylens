"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { runDiagnostics } from "@/lib/analysis/diagnostic-engine";
import { CheckCircle2, XCircle, AlertTriangle, Zap } from "lucide-react";

export function MethodAdvisor() {
  const columns = useAppStore((s) => s.columns);
  const results = useAppStore((s) => s.results);
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";

  const report = useMemo(() => runDiagnostics(columns, results), [columns, results]);
  if (columns.length === 0) return null;

  const items = [
    { key: "descriptive", label: en ? "Descriptive Stats" : "描述统计", ok: report.readiness.descriptive },
    { key: "correlation", label: en ? "Correlation" : "相关分析", ok: report.readiness.correlation },
    { key: "regression", label: en ? "Regression" : "回归分析", ok: report.readiness.regression, warn: !report.readiness.regression && report.readiness.correlation },
    { key: "factor_analysis", label: en ? "Factor Analysis" : "因子分析", ok: report.readiness.factor_analysis, warn: !report.readiness.factor_analysis && report.readiness.descriptive },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        <p className="text-sm font-medium text-foreground">{en ? "Method Advisor" : "方法建议"}</p>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/20 text-xs">
            {item.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={2} />
            ) : item.warn ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" strokeWidth={1.5} />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-300 shrink-0" strokeWidth={1.5} />
            )}
            <span className={item.ok ? "text-foreground" : item.warn ? "text-amber-600" : "text-muted-foreground/50"}>
              {item.label}
            </span>
            {!item.ok && item.warn && (
              <span className="text-[9px] text-amber-500 ml-auto">{en ? "caution" : "谨慎"}</span>
            )}
          </div>
        ))}
      </div>
      {/* Readiness verdict */}
      <div className={`px-3 py-2 rounded-lg text-xs ${
        report.readiness.level === "ready" ? "bg-emerald-50 text-emerald-700" :
        report.readiness.level === "partial" ? "bg-amber-50 text-amber-700" :
        report.readiness.level === "low" ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700"
      }`}>
        {report.readiness.label}
      </div>
    </div>
  );
}
