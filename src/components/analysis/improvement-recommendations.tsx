"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { scanItemRisks } from "@/lib/analysis/item-risk-scanner";
import { resolveSelectedVars } from "@/lib/stats/composite";
import type { AnalysisResults } from "@/types";
import { AlertTriangle, Lightbulb, ArrowRight } from "lucide-react";

interface Props {
  results: AnalysisResults;
}

interface Rec {
  priority: "critical" | "moderate" | "minor";
  category: string;
  issue: string;
  recommendation: string;
}

const prioConfig = {
  critical: { dot: "bg-red-400", text: "text-red-600", bg: "bg-red-50 border-red-100", label: { zh: "严重", en: "Critical" } },
  moderate: { dot: "bg-amber-400", text: "text-amber-600", bg: "bg-amber-50 border-amber-100", label: { zh: "中等", en: "Moderate" } },
  minor: { dot: "bg-blue-400", text: "text-blue-600", bg: "bg-blue-50 border-blue-100", label: { zh: "轻微", en: "Minor" } },
};

export function ImprovementRecommendations({ results }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const design = useAppStore((s) => s.researchDesign);
  const columns = useAppStore((s) => s.columns);
  const { reliability, validity, stability, meta, efa } = results;

  const allRecs = useMemo((): Rec[] => {
    const recs: Rec[] = [];
    const allVars = [...(design?.outcomeVariables ?? []), ...(design?.predictorVariables ?? [])];
    const { composites } = resolveSelectedVars(allVars);
    const dims = reliability.dimensions ?? [];

    // ---- SCALE-LEVEL: Low reliability ----
    for (const d of dims) {
      if (d.cronbachsAlpha < 0.70 && d.cronbachsAlpha > 0) {
        recs.push({
          priority: d.cronbachsAlpha < 0.50 ? "critical" : d.cronbachsAlpha < 0.60 ? "moderate" : "minor",
          category: en ? "Scale Reliability" : "量表信度",
          issue: en ? `${d.name} has low internal consistency (α = ${d.cronbachsAlpha.toFixed(2)})` : `${d.name} 内部一致性偏低 (α = ${d.cronbachsAlpha.toFixed(2)})`,
          recommendation: en
            ? "Inspect problematic items first. If reliability remains low after item revision, consider revising the scale definition or adding items."
            : "优先检查问题题项。若题项修订后信度仍然偏低，可考量调整量表定义或增加题项。",
        });
      }
    }
    // Single-scale case
    if (dims.length === 0 && reliability.cronbachsAlpha > 0 && reliability.cronbachsAlpha < 0.70) {
      recs.push({
        priority: reliability.cronbachsAlpha < 0.50 ? "critical" : "moderate",
        category: en ? "Scale Reliability" : "量表信度",
        issue: en ? `Cronbach's α = ${reliability.cronbachsAlpha.toFixed(2)} (below .70 threshold)` : `Cronbach's α = ${reliability.cronbachsAlpha.toFixed(2)} (低于 .70 阈值)`,
        recommendation: en
          ? "Review items with low item-total correlations. Consider revising or replacing the weakest items."
          : "检查题总相关较低的题项。可考量修订或替换最弱的题项。",
      });
    }

    // ---- ITEM-LEVEL: Problematic items ----
    const riskReport = scanItemRisks(results, columns, composites, en);
    for (const r of riskReport.items.slice(0, 5)) {
      recs.push({
        priority: r.severity === "critical" || r.severity === "high" ? "critical" : r.severity === "moderate" ? "moderate" : "minor",
        category: en ? "Item Diagnostic" : "题项诊断",
        issue: en
          ? `${r.item}${r.scale ? ` (${r.scale})` : ""}: ${r.primaryIssue.label}`
          : `${r.item}${r.scale ? ` (${r.scale})` : ""}: ${r.primaryIssue.label}`,
        recommendation: r.suggestedAction,
      });
    }

    // ---- CONSTRUCT-LEVEL: Overlap / Redundancy ----
    const cm = validity.correlationMatrix;
    const labels = validity.columnLabels;
    if (cm.length >= 2) {
      for (let i = 0; i < cm.length; i++) {
        for (let j = i + 1; j < cm.length; j++) {
          const r = cm[i][j];
          if (r == null || isNaN(r)) continue;
          const a = labels[i] ?? `V${i + 1}`;
          const b = labels[j] ?? `V${j + 1}`;
          if (Math.abs(r) >= 0.90) {
            recs.push({
              priority: "critical",
              category: en ? "Construct Redundancy" : "构念冗余",
              issue: en ? `${a} ↔ ${b} (r = ${r.toFixed(2)})` : `${a} ↔ ${b} (r = ${r.toFixed(2)})`,
              recommendation: en
                ? "These constructs are extremely highly correlated and may represent redundant measurements. Consider consolidating or examining conceptual distinction."
                : "这些构念关联极强，可能代表冗余测量。建议考量合并或审视概念区分。",
            });
          } else if (Math.abs(r) >= 0.80) {
            recs.push({
              priority: "moderate",
              category: en ? "Construct Overlap" : "构念重叠",
              issue: en ? `${a} ↔ ${b} (r = ${r.toFixed(2)})` : `${a} ↔ ${b} (r = ${r.toFixed(2)})`,
              recommendation: en
                ? "These constructs are highly correlated and may partially overlap. Review their conceptual distinction."
                : "这些构念高度相关，可能存在部分重叠。请审视其概念区分。",
            });
          }
        }
      }
    }

    // ---- STRUCTURE: Consistency issues ----
    if (composites.length > 0 && efa.loadings.length > 0) {
      for (const c of composites) {
        let matched = 0;
        let crossCount = 0;
        for (const item of c.sourceItems) {
          const idx = efa.itemLabels.indexOf(item);
          if (idx >= 0 && efa.loadings[idx].length > 1) {
            const loads = efa.loadings[idx].map((l, f) => ({ l: Math.abs(l), f: f + 1 })).sort((a, b) => b.l - a.l);
            if (loads.length >= 2 && loads[1].l >= 0.30) crossCount++;
            matched++;
          }
        }
        if (matched > 0 && crossCount / matched > 0.30) {
          recs.push({
            priority: "moderate",
            category: en ? "Structure Consistency" : "结构一致性",
            issue: en
              ? `${c.label}: ${crossCount}/${matched} items cross-load onto other factors`
              : `${c.label}: ${crossCount}/${matched} 个题项存在交叉载荷`,
            recommendation: en
              ? "Compare the metadata-defined scale with the observed factor structure. Review items loading onto unexpected factors."
              : "将元数据定义的量表与实测因子结构对比。审视载荷于非预期因子的题项。",
          });
        }
      }
    }

    // ---- DATASET-LEVEL: Missing data ----
    const totalMiss = columns.reduce((s, c) => s + c.missingCount, 0);
    const totalCells = columns.reduce((s, c) => s + c.uniqueValues + c.missingCount, 0);
    const missRate = totalCells > 0 ? totalMiss / totalCells : 0;
    if (missRate >= 0.20) {
      recs.push({
        priority: missRate >= 0.30 ? "critical" : "moderate",
        category: en ? "Missing Data" : "缺失数据",
        issue: en ? `Missing rate = ${(missRate * 100).toFixed(0)}%` : `缺失率 = ${(missRate * 100).toFixed(0)}%`,
        recommendation: en
          ? "Review the missing-data handling strategy. Consider multiple imputation, full-information maximum likelihood, or pairwise deletion where appropriate."
          : "审视缺失数据处理策略。可考量多重插补、全信息最大似然法或成对删除等方法。",
      });
    }

    // ---- DATASET-LEVEL: Sample size ----
    if (meta.sampleSize < 100) {
      recs.push({
        priority: meta.sampleSize < 30 ? "critical" : "moderate",
        category: en ? "Sample Size" : "样本量",
        issue: en ? `N = ${meta.sampleSize}` : `N = ${meta.sampleSize}`,
        recommendation: en
          ? `Small sample may produce unstable estimates. Interpret results with caution.${meta.sampleSize < 50 ? " Consider collecting additional data." : ""}`
          : `样本量较小可能导致估计不稳定。请谨慎解读结果。${meta.sampleSize < 50 ? " 建议考虑收集更多数据。" : ""}`,
      });
    }

    // ---- DATASET-LEVEL: Factor stability ----
    if (stability.stabilityLevel === "unstable") {
      recs.push({
        priority: "moderate",
        category: en ? "Statistical Stability" : "统计稳定性",
        issue: en ? "Bootstrap indicates unstable α estimates" : "Bootstrap 显示 α 估计不稳定",
        recommendation: en
          ? `Consider increasing sample size (recommended N ≥ ${stability.recommendedSampleSize}). Small samples may produce unreliable reliability estimates.`
          : `建议增加样本量（推荐 N ≥ ${stability.recommendedSampleSize}）。小样本可能产生不可靠的信度估计。`,
      });
    }

    // Sort: critical > moderate > minor
    return recs.sort((a, b) => {
      const order = { critical: 0, moderate: 1, minor: 2 };
      return order[a.priority] - order[b.priority];
    });
  }, [results, columns, design, en]);

  if (allRecs.length === 0) {
    return (
      <div className="rounded-lg bg-emerald-50/30 border border-emerald-100/50 p-3 text-[11px] text-emerald-600/80">
        {en ? "No significant psychometric issues detected." : "未发现显著的心理测量学问题。"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
        <span className="text-sm font-medium text-foreground">
          {en ? "Improvement Recommendations" : "改进建议"}
        </span>
        <span className="text-xs text-muted-foreground">
          {en ? `${allRecs.length} recommendation(s)` : `${allRecs.length} 条建议`}
        </span>
      </div>

      <div className="space-y-1.5">
        {allRecs.map((rec, i) => {
          const cfg = prioConfig[rec.priority];
          return (
            <div key={i} className={`rounded-lg border ${cfg.bg} px-3 py-2`}>
              <div className="flex items-start gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0 mt-1.5`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] text-muted-foreground/60">{rec.category}</span>
                    <span className={`text-[9px] px-1 py-0 rounded ${cfg.bg} ${cfg.text}`}>
                      {cfg.label[lang]}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-foreground">{rec.issue}</p>
                  <div className="flex items-start gap-1 mt-1">
                    <ArrowRight className="w-3 h-3 text-muted-foreground/30 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground">{rec.recommendation}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
