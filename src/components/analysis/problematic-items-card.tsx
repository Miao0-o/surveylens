"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { scanItemRisks } from "@/lib/analysis/item-risk-scanner";
import { resolveSelectedVars } from "@/lib/stats/composite";
import type { AnalysisResults, ColumnInfo } from "@/types";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface Props {
  results: AnalysisResults;
  columns: ColumnInfo[];
}

const severityConfig = {
  critical: { bg: "bg-red-50 border-red-100", text: "text-red-700", dot: "bg-red-400", label: { zh: "严重", en: "Critical" } },
  high: { bg: "bg-amber-50 border-amber-100", text: "text-amber-700", dot: "bg-amber-400", label: { zh: "高", en: "High" } },
  moderate: { bg: "bg-blue-50 border-blue-100", text: "text-blue-700", dot: "bg-blue-400", label: { zh: "中", en: "Moderate" } },
  low: { bg: "bg-secondary/20 border-border/50", text: "text-muted-foreground", dot: "bg-muted-foreground/30", label: { zh: "低", en: "Low" } },
};

export function ProblematicItemsCard({ results, columns }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const design = useAppStore((s) => s.researchDesign);

  const report = useMemo(() => {
    const allVars = [...(design?.outcomeVariables ?? []), ...(design?.predictorVariables ?? [])];
    const { composites } = resolveSelectedVars(allVars);
    return scanItemRisks(results, columns, composites, en);
  }, [results, columns, design, en]);

  if (report.items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
        <span className="text-sm font-medium text-foreground">
          {en ? "Problematic Items" : "问题题项"}
        </span>
        <span className="text-xs text-muted-foreground">
          {en
            ? `${report.totalRisky} item(s) requiring review`
            : `发现 ${report.totalRisky} 个需要关注的题项`}
        </span>
        {report.criticalCount > 0 && (
          <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
            {report.criticalCount} {en ? "critical" : "严重"}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {report.items.map((r) => {
          const cfg = severityConfig[r.severity];
          return (
            <div key={r.item} className={`rounded-lg border ${cfg.bg} px-3 py-2 flex items-start gap-2`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0 mt-1.5`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{r.item}</span>
                  {r.scale && <span className="text-[10px] text-muted-foreground/60">{r.scale}</span>}
                  <span className={`text-[9px] px-1 py-0 rounded ${cfg.bg} ${cfg.text}`}>
                    {cfg.label[lang]}
                  </span>
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {r.sources.map((s, i) => (
                    <p key={i} className="text-[10px] flex items-start gap-1">
                      <ArrowRight className="w-2.5 h-2.5 shrink-0 mt-0.5 text-muted-foreground/40" />
                      <span className="text-foreground/70">{s.label}</span>
                      <span className="text-muted-foreground/60 ml-1">{s.detail}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
