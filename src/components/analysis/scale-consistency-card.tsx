"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { computeScaleConsistency } from "@/lib/analysis/scale-consistency";
import { resolveSelectedVars } from "@/lib/stats/composite";
import type { AnalysisResults } from "@/types";
import { CheckCircle2, AlertTriangle, Info, Layers } from "lucide-react";

interface Props {
  results: AnalysisResults;
}

const gradeConfig = {
  excellent: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", label: { zh: "优秀", en: "Excellent" }, icon: CheckCircle2 },
  good: { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", label: { zh: "良好", en: "Good" }, icon: CheckCircle2 },
  moderate: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", label: { zh: "中等", en: "Moderate" }, icon: AlertTriangle },
  poor: { color: "text-red-600", bg: "bg-red-50", border: "border-red-100", label: { zh: "需审视", en: "Review" }, icon: AlertTriangle },
};

export function ScaleConsistencyCard({ results }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const design = useAppStore((s) => s.researchDesign);

  const report = useMemo(() => {
    const allVars = [...(design?.outcomeVariables ?? []), ...(design?.predictorVariables ?? [])];
    if (allVars.length === 0) return null;
    const { composites } = resolveSelectedVars(allVars);
    if (composites.length === 0) return null;
    return computeScaleConsistency(composites, results.efa.loadings, results.efa.itemLabels, en);
  }, [design, results.efa.loadings, results.efa.itemLabels, en]);

  if (!report || report.results.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="rounded-lg bg-card border border-border p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
          <span className="text-xs font-medium text-foreground">
            {en ? "Scale Structure Consistency" : "量表结构一致性"}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">{en ? "Avg Consistency: " : "平均一致性: "}</span>
            <span className="text-foreground font-semibold">{(report.overview.averageConsistency * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-emerald-600 font-medium">{report.overview.supportedCount}</span>
            <span className="text-muted-foreground"> {en ? "supported" : "个结构支持"}</span>
          </div>
          {report.overview.reviewCount > 0 && (
            <div>
              <span className="text-amber-600 font-medium">{report.overview.reviewCount}</span>
              <span className="text-muted-foreground"> {en ? "need review" : "个需要审视"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Per-scale results */}
      {report.results.map((r) => {
        const cfg = gradeConfig[r.interpretation];
        const Icon = cfg.icon;
        return (
          <div key={r.scaleLabel} className={`rounded-lg border ${cfg.border} ${cfg.bg} p-3 space-y-1.5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${cfg.color}`} strokeWidth={1.5} />
                <span className="text-xs font-medium text-foreground">{r.scaleLabel}</span>
              </div>
              <span className={`text-xs font-semibold ${cfg.color}`}>
                {(r.consistency * 100).toFixed(0)}% — {cfg.label[lang]}
              </span>
            </div>

            <p className="text-[10px] text-muted-foreground">
              {en
                ? `${r.dominantCount}/${r.totalItems} items load onto Factor ${r.dominantFactor}`
                : `${r.dominantCount}/${r.totalItems} 个题项载荷于因子${r.dominantFactor}`}
              {r.matchedItems < r.totalItems && (
                <span className="text-amber-500 ml-1">
                  ({en ? `${r.totalItems - r.matchedItems} item(s) not found in EFA` : `${r.totalItems - r.matchedItems} 个题项未在EFA中找到`})
                </span>
              )}
            </p>

            {/* Cross-loaded items */}
            {r.crossLoaded.length > 0 && (
              <div className="space-y-0.5 mt-1">
                {r.crossLoaded.map((cl) => (
                  <div key={cl.item} className="flex items-center gap-1.5 text-[10px]">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    <span className="text-amber-700">
                      {en
                        ? `${cl.item} → Factor ${cl.assignedTo} (loading = ${cl.loading.toFixed(2)})`
                        : `${cl.item} → 因子${cl.assignedTo} (载荷 = ${cl.loading.toFixed(2)})`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className={`text-[10px] ${cfg.color}`}>{r.summary}</p>
          </div>
        );
      })}
    </div>
  );
}
