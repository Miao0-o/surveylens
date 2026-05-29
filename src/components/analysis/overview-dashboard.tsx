"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type { AnalysisResults } from "@/types";
import { resolveSelectedVars } from "@/lib/stats/composite";
import { computeScaleConsistency } from "@/lib/analysis/scale-consistency";
import { CheckCircle2, AlertTriangle, XCircle, Shield, TrendingUp, ArrowRight } from "lucide-react";

interface Props {
  results: AnalysisResults;
}

// ============================================================
// Two-layer decision system
// Layer 1: Quality Gates (must pass for READY status)
// Layer 2: Readiness Score (summary indicator)
// ============================================================

function readinessStatus(gateResult: ReturnType<typeof evaluateGates>, score: number, en: boolean): {
  label: string;
  level: "ready" | "review" | "not_ready";
} {
  if (!gateResult.allPassed) {
    if (gateResult.failed.length >= 3) {
      return { label: en ? "NOT READY" : "未就绪", level: "not_ready" };
    }
    return { label: en ? "REVIEW REQUIRED" : "建议审阅", level: "review" };
  }
  if (score >= 80) return { label: en ? "READY" : "就绪", level: "ready" };
  if (score >= 60) return { label: en ? "REVIEW RECOMMENDED" : "建议审阅", level: "review" };
  return { label: en ? "NOT READY" : "未就绪", level: "not_ready" };
}

function statusColor(level: "ready" | "review" | "not_ready"): string {
  if (level === "ready") return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (level === "review") return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

interface Gate {
  name: string;
  labelZh: string;
  labelEn: string;
  passed: boolean;
  detail: string;
}

function evaluateGates(
  reliability: AnalysisResults["reliability"],
  validity: AnalysisResults["validity"],
  missingRate: number,
  en: boolean
): { gates: Gate[]; allPassed: boolean; failed: Gate[] } {
  const dims = reliability.dimensions ?? [];
  const gates: Gate[] = [];

  // Reliability gate: >= 50% scales have α >= .70
  if (dims.length > 0) {
    const passing = dims.filter(d => d.cronbachsAlpha >= 0.70).length;
    const ratio = passing / dims.length;
    const passed = ratio >= 0.50;
    gates.push({
      name: "reliability",
      labelZh: "信度门槛",
      labelEn: "Reliability Gate",
      passed,
      detail: en
        ? `${passing}/${dims.length} scales meet α ≥ .70 (${(ratio * 100).toFixed(0)}%) — ${passed ? "Passed" : "Requires ≥ 50%"}.`
        : `${passing}/${dims.length} 个量表 α ≥ .70 (${(ratio * 100).toFixed(0)}%) — ${passed ? "通过" : "需要 ≥ 50%"}。`,
    });
  } else if (reliability.cronbachsAlpha > 0) {
    // Single scale
    const passed = reliability.cronbachsAlpha >= 0.70;
    gates.push({
      name: "reliability",
      labelZh: "信度门槛",
      labelEn: "Reliability Gate",
      passed,
      detail: en
        ? `α = ${reliability.cronbachsAlpha.toFixed(2)} — ${passed ? "Passed" : "Below .70 threshold"}.`
        : `α = ${reliability.cronbachsAlpha.toFixed(2)} — ${passed ? "通过" : "低于 .70 阈值"}。`,
    });
  }

  // Factor analysis gate: KMO >= .60 AND Bartlett p < .05
  if (validity.kmo > 0) {
    const passed = validity.kmo >= 0.60 && validity.bartlettPValue < 0.05;
    gates.push({
      name: "factor",
      labelZh: "因子分析门槛",
      labelEn: "Factor Analysis Gate",
      passed,
      detail: en
        ? `KMO = ${validity.kmo.toFixed(2)}, Bartlett ${validity.bartlettPValue < 0.001 ? "p < .001" : `p = ${validity.bartlettPValue.toFixed(3)}`} — ${passed ? "Passed" : "Failed"}.`
        : `KMO = ${validity.kmo.toFixed(2)}，Bartlett ${validity.bartlettPValue < 0.001 ? "p < .001" : `p = ${validity.bartlettPValue.toFixed(3)}`} — ${passed ? "通过" : "未通过"}。`,
    });
  }

  // Missing data gate: < 30%
  if (missingRate >= 0) {
    const passed = missingRate < 0.30;
    gates.push({
      name: "missing",
      labelZh: "缺失数据门槛",
      labelEn: "Missing Data Gate",
      passed,
      detail: en
        ? `Missing rate = ${(missingRate * 100).toFixed(0)}% — ${passed ? "Passed" : "Failed (> 30%)"}.`
        : `缺失率 = ${(missingRate * 100).toFixed(0)}% — ${passed ? "通过" : "未通过 (> 30%)"}。`,
    });
  }

  return { gates, allPassed: gates.every(g => g.passed), failed: gates.filter(g => !g.passed) };
}

export function OverviewDashboard({ results }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const design = useAppStore((s) => s.researchDesign);
  const columns = useAppStore((s) => s.columns);
  const { reliability, validity, stability, meta, efa } = results;
  const allVars = [...(design?.outcomeVariables ?? []), ...(design?.predictorVariables ?? [])];
  const { composites } = useMemo(() => resolveSelectedVars(allVars), [allVars]);

  // Missing data rate
  const missingRate = useMemo(() => {
    if (columns.length === 0) return -1;
    const totalMiss = columns.reduce((s, c) => s + c.missingCount, 0);
    const totalCells = columns.reduce((s, c) => s + c.uniqueValues + c.missingCount, 0);
    return totalCells > 0 ? totalMiss / totalCells : 0;
  }, [columns]);

  // Scale consistency
  const consistencyReport = useMemo(
    () => composites.length > 0 && efa.loadings.length > 0
      ? computeScaleConsistency(composites, efa.loadings, efa.itemLabels, en)
      : null,
    [composites, efa.loadings, efa.itemLabels, en]
  );

  const dims = reliability.dimensions ?? [];
  const passingScales = dims.filter(d => d.cronbachsAlpha >= 0.70);
  const failingScales = dims.filter(d => d.cronbachsAlpha < 0.70);
  const hasMultiScale = dims.length > 0;

  // Construct relationships
  const corrMatrix = validity.correlationMatrix;
  const corrLabels = validity.columnLabels;
  const overlapPairs: { a: string; b: string; r: number }[] = [];
  const redundancyPairs: { a: string; b: string; r: number }[] = [];
  if (corrMatrix.length >= 2) {
    for (let i = 0; i < corrMatrix.length; i++) {
      for (let j = i + 1; j < corrMatrix.length; j++) {
        const r = corrMatrix[i][j];
        if (r == null || isNaN(r)) continue;
        if (Math.abs(r) >= 0.90) redundancyPairs.push({ a: corrLabels[i] ?? `V${i + 1}`, b: corrLabels[j] ?? `V${j + 1}`, r });
        else if (Math.abs(r) >= 0.80) overlapPairs.push({ a: corrLabels[i] ?? `V${i + 1}`, b: corrLabels[j] ?? `V${j + 1}`, r });
      }
    }
  }

  // Weak items (item-total < 0.20 or negative)
  const weakItems: { item: string; corr: number }[] = [];
  for (const [item, corr] of Object.entries(reliability.itemTotalCorrelation)) {
    if (corr < 0.20) weakItems.push({ item, corr: Math.round(corr * 1000) / 1000 });
  }
  weakItems.sort((a, b) => a.corr - b.corr);

  // LAYER 1: Quality gates
  const { gates, allPassed, failed } = useMemo(
    () => evaluateGates(reliability, validity, missingRate, en),
    [reliability, validity, missingRate, en]
  );

  // LAYER 2: Readiness score
  const readinessScore = useMemo(() => {
    let score = 0;
    // Reliability (30%)
    const meanAlpha = hasMultiScale
      ? dims.reduce((s, d) => s + d.cronbachsAlpha, 0) / dims.length
      : reliability.cronbachsAlpha;
    if (meanAlpha >= 0.90) score += 30;
    else if (meanAlpha >= 0.80) score += 26;
    else if (meanAlpha >= 0.70) score += 20;
    else if (meanAlpha >= 0.60) score += 12;
    else score += 4;

    // Factor structure (25%)
    if (validity.kmo >= 0.80) score += 25;
    else if (validity.kmo >= 0.60) score += 18;
    else if (validity.kmo > 0) score += 8;

    // Structure consistency (20%)
    if (consistencyReport) {
      const ac = consistencyReport.overview.averageConsistency;
      if (ac >= 0.90) score += 20;
      else if (ac >= 0.80) score += 16;
      else if (ac >= 0.70) score += 10;
      else score += 4;
    } else if (hasMultiScale) score += 10;
    else score += 16;

    // Stability (10%)
    if (stability.stabilityLevel === "stable") score += 10;
    else if (stability.stabilityLevel === "moderate") score += 6;
    else score += 2;

    // Sample size (10%)
    if (meta.sampleSize >= 200) score += 10;
    else if (meta.sampleSize >= 100) score += 7;
    else if (meta.sampleSize >= 50) score += 4;
    else score += 1;

    // Missing data (5%)
    if (missingRate < 0.05) score += 5;
    else if (missingRate < 0.10) score += 4;
    else if (missingRate < 0.20) score += 3;
    else if (missingRate < 0.30) score += 1;

    return Math.round(score);
  }, [hasMultiScale, dims, reliability.cronbachsAlpha, validity.kmo, consistencyReport, stability.stabilityLevel, meta.sampleSize, missingRate]);

  const gateResult = { gates, allPassed, failed };
  const status = readinessStatus(gateResult, readinessScore, en);
  const statusCls = statusColor(status.level);

  // Recommended actions
  const actions = useMemo((): { text: string; priority: "high" | "medium" | "low" }[] => {
    const result: { text: string; priority: "high" | "medium" | "low" }[] = [];

    // Failed gates first
    for (const g of failed) {
      if (g.name === "reliability") {
        for (const d of failingScales) {
          result.push({
            text: en ? `Review ${d.name} scale (α = ${d.cronbachsAlpha.toFixed(2)})` : `审阅 ${d.name} 量表 (α = ${d.cronbachsAlpha.toFixed(2)})`,
            priority: "high",
          });
        }
      }
      if (g.name === "factor") {
        result.push({
          text: en ? "Factor analysis prerequisites not met — review item inter-correlations" : "因子分析前提条件不满足 — 检查题项间相关性",
          priority: "high",
        });
      }
      if (g.name === "missing") {
        result.push({
          text: en ? "Review missing data handling strategy" : "审阅缺失数据处理策略",
          priority: "high",
        });
      }
    }

    // Weak items
    for (const wi of weakItems.slice(0, 3)) {
      result.push({
        text: en ? `Inspect ${wi.item} (item-total r = ${wi.corr.toFixed(2)})` : `检查题项 ${wi.item} (题总相关 = ${wi.corr.toFixed(2)})`,
        priority: "medium",
      });
    }

    // Construct overlap
    for (const p of overlapPairs.slice(0, 2)) {
      result.push({
        text: en ? `Check construct overlap: ${p.a} ↔ ${p.b} (r = ${p.r.toFixed(2)})` : `检查构念重叠: ${p.a} ↔ ${p.b} (r = ${p.r.toFixed(2)})`,
        priority: "medium",
      });
    }
    for (const p of redundancyPairs.slice(0, 2)) {
      result.push({
        text: en ? `Check construct redundancy: ${p.a} ↔ ${p.b} (r = ${p.r.toFixed(2)})` : `检查构念冗余: ${p.a} ↔ ${p.b} (r = ${p.r.toFixed(2)})`,
        priority: "high",
      });
    }

    if (meta.sampleSize < 50) {
      result.push({
        text: en ? `Increase sample size (N = ${meta.sampleSize}) for stable estimates` : `增加样本量 (N = ${meta.sampleSize}) 以获得稳定估计`,
        priority: "medium",
      });
    }

    if (result.length === 0) {
      result.push({
        text: en ? "Dataset appears ready for next-stage analysis." : "数据集可以进入下一阶段分析。",
        priority: "low",
      });
    }

    return result;
  }, [failed, failingScales, weakItems, overlapPairs, redundancyPairs, meta.sampleSize, en]);

  return (
    <div className="space-y-5">
      {/* === HEADER: Status + Score === */}
      <div className={`rounded-xl border px-5 py-4 flex items-center gap-4 ${statusCls}`}>
        <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-white/30">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-black/10" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(readinessScore / 100) * 176} 176`} />
          </svg>
          <span className="absolute text-lg font-bold">{readinessScore}</span>
        </div>
        <div>
          <p className="text-sm font-semibold">{en ? "Research Readiness" : "研究准备度"}</p>
          <p className="text-xs opacity-80">{status.label}</p>
          {!allPassed && (
            <p className="text-[10px] opacity-60 mt-0.5">
              {en ? `${failed.length} gate(s) failed` : `${failed.length} 个门槛未通过`}
            </p>
          )}
        </div>
      </div>

      {/* === QUALITY GATES === */}
      {gates.length > 0 && (
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-xs font-medium">{en ? "Quality Gates" : "质量门槛"}</span>
          </div>
          <div className="space-y-1.5">
            {gates.map(g => (
              <div key={g.name} className="flex items-start gap-2 text-[11px]">
                {g.passed ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                )}
                <div>
                  <span className="font-medium text-foreground">{en ? g.labelEn : g.labelZh}</span>
                  <span className={`ml-1.5 ${g.passed ? "text-emerald-600" : "text-red-600"}`}>
                    {g.passed ? "✓" : "✗"}
                  </span>
                  <p className="text-muted-foreground">{g.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <p className={`text-base font-semibold ${missingRate >= 0.30 ? "text-red-500" : missingRate >= 0.20 ? "text-amber-500" : ""}`}>
            {missingRate >= 0 ? `${(missingRate * 100).toFixed(0)}%` : "—"}
          </p>
        </div>
      </div>

      {/* === RELIABILITY SUMMARY === */}
      {hasMultiScale ? (
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-xs font-medium">{en ? "Reliability Summary" : "信度概况"}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {en
              ? `${passingScales.length} / ${dims.length} scales meet α ≥ .70`
              : `${passingScales.length} / ${dims.length} 个量表 α ≥ .70`}
          </p>
          {failingScales.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {failingScales.map(d => (
                <p key={d.name} className="text-[10px] text-amber-600 ml-2">
                  {d.name} (α = {d.cronbachsAlpha.toFixed(2)})
                </p>
              ))}
            </div>
          )}
        </div>
      ) : reliability.cronbachsAlpha > 0 ? (
        <div className="rounded-lg bg-card border border-border p-3">
          <span className="text-xs font-medium">{en ? "Reliability" : "信度"} </span>
          <span className="text-[11px] text-muted-foreground">α = {reliability.cronbachsAlpha.toFixed(2)}</span>
        </div>
      ) : null}

      {/* === FACTOR STRUCTURE SUMMARY === */}
      <div className="rounded-lg bg-card border border-border p-3">
        <span className="text-xs font-medium">{en ? "Factor Structure" : "因子结构"} </span>
        {validity.kmo > 0 ? (
          <span className="text-[11px] text-muted-foreground">
            KMO = {validity.kmo.toFixed(2)}, {en ? "Bartlett" : "Bartlett"} {validity.bartlettPValue < 0.001 ? "p < .001" : `p = ${validity.bartlettPValue.toFixed(3)}`}
            {consistencyReport && (
              <span className="ml-2">| {en ? "Consistency" : "一致性"}: {(consistencyReport.overview.averageConsistency * 100).toFixed(0)}%</span>
            )}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">{en ? "Not yet assessed" : "尚未评估"}</span>
        )}
      </div>

      {/* === CONSTRUCT RELATIONSHIPS === */}
      {corrMatrix.length >= 2 && (
        <div className="rounded-lg bg-card border border-border p-3">
          <span className="text-xs font-medium">{en ? "Construct Relationships" : "构念间关系"} </span>
          {overlapPairs.length === 0 && redundancyPairs.length === 0 ? (
            <span className="text-[11px] text-muted-foreground">{en ? "OK" : "正常"}</span>
          ) : (
            <span className="text-[11px] text-amber-600">
              {overlapPairs.length > 0 && `${overlapPairs.length} ${en ? "overlap" : "重叠"}`}
              {redundancyPairs.length > 0 && `, ${redundancyPairs.length} ${en ? "redundancy" : "冗余"}`}
            </span>
          )}
        </div>
      )}

      {/* === STABILITY === */}
      <div className="rounded-lg bg-card border border-border p-3">
        <span className="text-xs font-medium">{en ? "Stability" : "稳定性"} </span>
        <span className={`text-[11px] ${stability.stabilityLevel === "stable" ? "text-emerald-600" : stability.stabilityLevel === "moderate" ? "text-amber-600" : "text-red-500"}`}>
          {stability.stabilityLevel === "stable"
            ? (en ? "Stable" : "稳定")
            : stability.stabilityLevel === "moderate"
              ? (en ? "Moderate" : "中等")
              : (en ? "Unstable" : "不稳定")}
          {stability.recommendedSampleSize > 0 && ` (N ≥ ${stability.recommendedSampleSize})`}
        </span>
      </div>

      {/* === RECOMMENDED ACTIONS === */}
      <div className="rounded-lg bg-card border border-border p-3">
        <p className="text-xs font-medium mb-2">{en ? "Recommended Actions" : "建议操作"}</p>
        <div className="space-y-1.5">
          {actions.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <ArrowRight className={`w-3 h-3 shrink-0 mt-0.5 ${a.priority === "high" ? "text-red-500" : a.priority === "medium" ? "text-amber-500" : "text-muted-foreground"}`} strokeWidth={1.5} />
              <span className={a.priority === "high" ? "text-red-600" : a.priority === "medium" ? "text-amber-600" : "text-muted-foreground"}>
                {a.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
