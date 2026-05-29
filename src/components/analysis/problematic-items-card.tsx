"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { scanItemRisks } from "@/lib/analysis/item-risk-scanner";
import { resolveSelectedVars } from "@/lib/stats/composite";
import { buildAnalysisScope, filterColumnsToScope } from "@/lib/analysis/scope-filter";
import type { AnalysisResults, ColumnInfo } from "@/types";
import { AlertTriangle, ArrowRight, Lightbulb } from "lucide-react";

interface Props {
  results: AnalysisResults;
  columns: ColumnInfo[];
}

const severityBadge = {
  critical: "bg-red-50 text-red-700 border-red-100",
  high: "bg-amber-50 text-amber-700 border-amber-100",
  moderate: "bg-blue-50 text-blue-700 border-blue-100",
  low: "bg-secondary/30 text-muted-foreground border-border/40",
} as const;

const severityLabel = {
  critical: { zh: "严重", en: "Critical" },
  high: { zh: "高", en: "High" },
  moderate: { zh: "中", en: "Moderate" },
  low: { zh: "低", en: "Low" },
} as const;

export function ProblematicItemsCard({ results, columns }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const design = useAppStore((s) => s.researchDesign);

  const report = useMemo(() => {
    const allVars = [...(design?.outcomeVariables ?? []), ...(design?.predictorVariables ?? [])];
    const { composites } = resolveSelectedVars(allVars);
    const scope = buildAnalysisScope(columns, design ? { outcomeVariables: design.outcomeVariables, predictorVariables: design.predictorVariables } : null);
    const scopedColumns = filterColumnsToScope(columns, scope);
    return scanItemRisks(results, scopedColumns, composites, en);
  }, [results, columns, design, en]);

  if (report.items.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
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
            {report.criticalCount}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {report.items.map((r) => (
          <div key={r.item} className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
            {/* Item header */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{r.item}</span>
              {r.scale && (
                <span className="text-[10px] text-muted-foreground/60 bg-secondary/30 px-1.5 py-0.5 rounded">
                  {r.scale}
                </span>
              )}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${severityBadge[r.severity]}`}>
                {severityLabel[r.severity][lang]}
              </span>
            </div>

            {/* Primary issue */}
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-red-500 font-medium shrink-0 mt-0.5">
                {en ? "Primary:" : "主要问题："}
              </span>
              <div>
                <span className="text-[11px] text-foreground">{r.primaryIssue.label}</span>
                <span className="text-[10px] text-muted-foreground ml-1">({r.primaryIssue.detail})</span>
              </div>
            </div>

            {/* Secondary issues */}
            {r.secondaryIssues.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-amber-500 font-medium shrink-0 mt-0.5">
                  {en ? "Secondary:" : "次要："}
                </span>
                <div className="space-y-0.5">
                  {r.secondaryIssues.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px]">
                      <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/30 shrink-0" />
                      <span className="text-foreground/70">{s.label}</span>
                      <span className="text-muted-foreground/50">({s.detail})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested action */}
            <div className="flex items-start gap-2">
              <Lightbulb className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" strokeWidth={1.5} />
              <span className="text-[10px] text-blue-600/80">
                {r.suggestedAction}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
