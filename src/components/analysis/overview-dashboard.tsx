"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type { AnalysisResults } from "@/types";
import { resolveSelectedVars } from "@/lib/stats/composite";
import { computeScaleConsistency } from "@/lib/analysis/scale-consistency";
import { CheckCircle2, AlertTriangle, XCircle, Shield, TrendingUp } from "lucide-react";

interface Props {
  results: AnalysisResults;
}

function readinessLabel(score: number, en: boolean): string {
  if (score >= 80) return en ? "READY" : "就绪";
  if (score >= 60) return en ? "REVIEW RECOMMENDED" : "建议审阅";
  return en ? "NOT READY" : "未就绪";
}

function readinessColor(score: number): string {
  if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

export function OverviewDashboard({ results }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const design = useAppStore((s) => s.researchDesign);
  const { reliability, validity, stability, meta, efa } = results;
  const allVars = [...(design?.outcomeVariables ?? []), ...(design?.predictorVariables ?? [])];
  const { composites } = useMemo(() => resolveSelectedVars(allVars), [allVars]);

  // Scale consistency
  const consistencyReport = useMemo(
    () => composites.length > 0 && efa.loadings.length > 0
      ? computeScaleConsistency(composites, efa.loadings, efa.itemLabels, en)
      : null,
    [composites, efa.loadings, efa.itemLabels, en]
  );

  // Reliability summary
  const dims = reliability.dimensions ?? [];
  const passingScales = dims.filter(d => d.cronbachsAlpha >= 0.70);
  const failingScales = dims.filter(d => d.cronbachsAlpha < 0.70);
  const hasMultiScale = dims.length > 0;

  // Construct relationship summary — find strongest overlap/redundancy
  const corrMatrix = validity.correlationMatrix;
  const corrLabels = validity.columnLabels;
  const overlapPairs: { a: string; b: string; r: number }[] = [];
  const redundancyPairs: { a: string; b: string; r: number }[] = [];
  if (corrMatrix.length >= 2) {
    for (let i = 0; i < corrMatrix.length; i++) {
      for (let j = i + 1; j < corrMatrix.length; j++) {
        const r = corrMatrix[i][j];
        if (r == null || isNaN(r)) continue;
        if (Math.abs(r) >= 0.90) {
          redundancyPairs.push({ a: corrLabels[i] ?? `V${i + 1}`, b: corrLabels[j] ?? `V${j + 1}`, r });
        } else if (Math.abs(r) >= 0.80) {
          overlapPairs.push({ a: corrLabels[i] ?? `V${i + 1}`, b: corrLabels[j] ?? `V${j + 1}`, r });
        }
      }
    }
  }

  // Readiness score
  const readinessScore = useMemo(() => {
    let score = 0;
    // Reliability (30%): mean alpha of all scales or global alpha
    const meanAlpha = hasMultiScale
      ? dims.reduce((s, d) => s + d.cronbachsAlpha, 0) / dims.length
      : reliability.cronbachsAlpha;
    if (meanAlpha >= 0.90) score += 30;
    else if (meanAlpha >= 0.80) score += 26;
    else if (meanAlpha >= 0.70) score += 20;
    else if (meanAlpha >= 0.60) score += 12;
    else score += 4;

    // Factor structure (25%): KMO + EFA
    if (validity.kmo >= 0.80) score += 25;
    else if (validity.kmo >= 0.60) score += 18;
    else if (validity.kmo > 0) score += 8;

    // Structure consistency (20%)
    if (consistencyReport) {
      const avgCons = consistencyReport.overview.averageConsistency;
      if (avgCons >= 0.90) score += 20;
      else if (avgCons >= 0.80) score += 16;
      else if (avgCons >= 0.70) score += 10;
      else score += 4;
    } else if (hasMultiScale) {
      score += 10; // multi-scale but no consistency data
    } else {
      score += 16; // single scale, skip consistency check
    }

    // Stability (15%)
    if (stability.stabilityLevel === "stable") score += 15;
    else if (stability.stabilityLevel === "moderate") score += 10;
    else score += 3;

    // Sample size (10%)
    if (meta.sampleSize >= 200) score += 10;
    else if (meta.sampleSize >= 100) score += 7;
    else if (meta.sampleSize >= 50) score += 4;
    else score += 1;

    return Math.round(score);
  }, [hasMultiScale, dims, reliability.cronbachsAlpha, validity.kmo, consistencyReport, stability.stabilityLevel, meta.sampleSize]);

  const readinessLvl = readinessLabel(readinessScore, en);
  const readinessCls = readinessColor(readinessScore);

  // Overall recommendation
  const recommendation = useMemo(() => {
    const parts: string[] = [];
    if (readinessScore >= 80) {
      parts.push(en
        ? "Your dataset appears suitable for downstream statistical analysis."
        : "您的数据集整体适合进行下一阶段统计分析。");
    } else if (readinessScore >= 60) {
      parts.push(en
        ? "Your dataset is mostly adequate but some areas require attention before proceeding."
        : "您的数据集基本可用，但部分领域需要在进一步分析前关注。");
    } else {
      parts.push(en
        ? "Your dataset requires significant review before proceeding to inferential analyses."
        : "您的数据集在进入推断性分析前需要重点审阅。");
    }
    if (failingScales.length > 0) {
      const names = failingScales.map(d => `${d.name} (α=${d.cronbachsAlpha.toFixed(2)})`).join(", ");
      parts.push(en
        ? `Before proceeding, review the following scales due to lower internal consistency: ${names}.`
        : `建议优先审视以下量表信度：${names}。`);
    }
    if (overlapPairs.length > 0 || redundancyPairs.length > 0) {
      parts.push(en
        ? "Some constructs show high inter-correlations — consider whether these represent distinct constructs."
        : "部分构念间存在较高关联——建议考虑这些构念是否确实代表不同维度。");
    }
    return parts.join(" ");
  }, [readinessScore, failingScales, overlapPairs, redundancyPairs, en]);

  return (
    <div className="space-y-5">
      {/* === RESEARCH READINESS HEADER === */}
      <div className={`rounded-xl border px-5 py-4 flex items-center gap-4 ${readinessCls}`}>
        <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-white/40">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-black/10" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(readinessScore / 100) * 176} 176`} />
          </svg>
          <span className="absolute text-lg font-bold">{readinessScore}</span>
        </div>
        <div>
          <p className="text-sm font-semibold">{en ? "Research Readiness" : "研究准备度"}</p>
          <p className="text-xs opacity-80">{readinessLvl}</p>
        </div>
      </div>

      {/* === DATASET SUMMARY === */}
      <div className="grid grid-cols-4 gap-2">
        <div className="px-3 py-2 rounded-lg bg-card border border-border">
          <p className="text-[10px] text-muted-foreground">{en ? "Sample" : "样本量"}</p>
          <p className="text-base font-semibold">{meta.sampleSize}</p>
        </div>
        <div className="px-3 py-2 rounded-lg bg-card border border-border">
          <p className="text-[10px] text-muted-foreground">{en ? "Scales" : "量表数"}</p>
          <p className="text-base font-semibold">{hasMultiScale ? dims.length : (reliability.cronbachsAlpha > 0 ? 1 : 0)}</p>
        </div>
        <div className="px-3 py-2 rounded-lg bg-card border border-border">
          <p className="text-[10px] text-muted-foreground">{en ? "Items" : "题项"}</p>
          <p className="text-base font-semibold">{meta.itemCount}</p>
        </div>
        <div className="px-3 py-2 rounded-lg bg-card border border-border">
          <p className="text-[10px] text-muted-foreground">{en ? "Missing" : "缺失"}</p>
          <p className="text-base font-semibold">—</p>
        </div>
      </div>

      {/* === RELIABILITY SUMMARY === */}
      {hasMultiScale ? (
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-xs font-medium">{en ? "Reliability Summary" : "信度概况"}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {en
              ? `${passingScales.length} / ${dims.length} scales meet acceptable reliability (α ≥ .70).`
              : `${passingScales.length} / ${dims.length} 个量表达到可接受信度 (α ≥ .70)。`}
          </p>
          {failingScales.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              <p className="text-[10px] text-amber-600 font-medium">{en ? "Needs review:" : "需要关注："}</p>
              {failingScales.map(d => (
                <p key={d.name} className="text-[10px] text-amber-600/80 ml-2">
                  {d.name} (α = {d.cronbachsAlpha.toFixed(2)})
                </p>
              ))}
            </div>
          )}
        </div>
      ) : reliability.cronbachsAlpha > 0 ? (
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-xs font-medium">{en ? "Reliability" : "信度"}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            α = {reliability.cronbachsAlpha.toFixed(2)}
            {reliability.cronbachsAlpha >= 0.70
              ? (en ? " — Acceptable" : " — 可接受")
              : (en ? " — Needs review" : " — 需要关注")}
          </p>
        </div>
      ) : null}

      {/* === FACTOR STRUCTURE SUMMARY === */}
      <div className="rounded-lg bg-card border border-border p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
          <span className="text-xs font-medium">{en ? "Factor Structure" : "因子结构"}</span>
        </div>
        {validity.kmo > 0 ? (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">
              {validity.kmo >= 0.60 ? (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" strokeWidth={1.5} />
                  {en
                    ? `Factor analysis appropriate (KMO = ${validity.kmo.toFixed(2)}, Bartlett ${validity.bartlettPValue < 0.001 ? "p < .001" : `p = ${validity.bartlettPValue.toFixed(3)}`}).`
                    : `适合因子分析 (KMO = ${validity.kmo.toFixed(2)}，Bartlett ${validity.bartlettPValue < 0.001 ? "p < .001" : `p = ${validity.bartlettPValue.toFixed(3)}`})。`}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" strokeWidth={1.5} />
                  {en ? "Factor structure may require review." : "因子结构可能需要审视。"}
                </span>
              )}
            </p>
            {consistencyReport && (
              <p className="text-[11px] text-muted-foreground">
                {en
                  ? `Average structure consistency: ${(consistencyReport.overview.averageConsistency * 100).toFixed(0)}%. ${consistencyReport.overview.supportedCount} / ${consistencyReport.overview.totalScales} scales structurally supported.`
                  : `平均结构一致性: ${(consistencyReport.overview.averageConsistency * 100).toFixed(0)}%，${consistencyReport.overview.supportedCount} / ${consistencyReport.overview.totalScales} 个量表结构支持。`}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {en ? "Factor analysis not yet assessed." : "尚未评估因子结构。"}
          </p>
        )}
      </div>

      {/* === CONSTRUCT RELATIONSHIP SUMMARY === */}
      {corrMatrix.length >= 2 && (
        <div className="rounded-lg bg-card border border-border p-3">
          <p className="text-xs font-medium mb-2">{en ? "Construct Relationships" : "构念间关系"}</p>
          {overlapPairs.length === 0 && redundancyPairs.length === 0 ? (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" strokeWidth={1.5} />
              {en ? "Most constructs show distinguishable relationships." : "多数构念保持可区分的关联模式。"}
            </p>
          ) : (
            <div className="space-y-1">
              {overlapPairs.map((p, i) => (
                <p key={`o-${i}`} className="text-[11px] text-amber-600/80 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                  {en ? "Potential overlap: " : "可能重叠: "}{p.a} ↔ {p.b} (r = {p.r.toFixed(2)})
                </p>
              ))}
              {redundancyPairs.map((p, i) => (
                <p key={`r-${i}`} className="text-[11px] text-red-600/80 flex items-center gap-1">
                  <XCircle className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                  {en ? "Potential redundancy: " : "可能冗余: "}{p.a} ↔ {p.b} (r = {p.r.toFixed(2)})
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === STABILITY SUMMARY === */}
      <div className="rounded-lg bg-card border border-border p-3">
        <p className="text-xs font-medium mb-2">{en ? "Reliability Stability" : "信度稳定性"}</p>
        <p className="text-[11px] text-muted-foreground">
          {stability.stabilityLevel === "stable" ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
              {en ? "Stable — α estimates are consistent across sample sizes." : "稳定 — α 估计在不同样本量下保持一致。"}
            </span>
          ) : stability.stabilityLevel === "moderate" ? (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
              {en ? "Moderately stable" : "中等稳定"}
              {stability.recommendedSampleSize > 0 && ` — ${en ? "recommended N ≥ " : "建议 N ≥ "}${stability.recommendedSampleSize}`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-500">
              <XCircle className="w-3 h-3" strokeWidth={1.5} />
              {en ? "Unstable — results may vary with sample size." : "不稳定 — 结果可能随样本量变化。"}
              {stability.recommendedSampleSize > 0 && ` (${en ? "recommended N ≥ " : "建议 N ≥ "}${stability.recommendedSampleSize})`}
            </span>
          )}
        </p>
      </div>

      {/* === OVERALL RECOMMENDATION === */}
      <div className="rounded-lg bg-blue-50/30 border border-blue-100/50 p-3">
        <p className="text-xs font-medium text-blue-700 mb-1">
          {en ? "Recommendation" : "综合建议"}
        </p>
        <p className="text-[11px] text-blue-600/80">{recommendation}</p>
      </div>
    </div>
  );
}
