"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type { AnalysisResults } from "@/types";
import { resolveSelectedVars } from "@/lib/stats/composite";
import { computeScaleConsistency } from "@/lib/analysis/scale-consistency";
import { detectAnalysisMode } from "@/lib/analysis/registry";
import { scanItemRisks } from "@/lib/analysis/item-risk-scanner";
import { buildAnalysisScope, scopedMissingRate } from "@/lib/analysis/scope-filter";
import { CheckCircle2, AlertTriangle, XCircle, Shield, TrendingUp, ArrowRight, Info } from "lucide-react";

interface Props {
  results: AnalysisResults;
}

// ============================================================
// Two-layer decision system
// Layer 1: Quality Gates (severity-weighted, must pass for READY)
// Layer 2: Readiness Score (descriptive only, never overrides gates)
// ============================================================

type GateSeverity = "excellent" | "good" | "acceptable" | "questionable" | "poor" | "critical";

interface Gate {
  name: string;
  labelZh: string;
  labelEn: string;
  passed: boolean;
  severity: GateSeverity;
  detail: string;
}

function severityLabel(s: GateSeverity, en: boolean): string {
  const map: Record<GateSeverity, { zh: string; en: string }> = {
    excellent: { zh: "优秀", en: "Excellent" },
    good: { zh: "良好", en: "Good" },
    acceptable: { zh: "可接受", en: "Acceptable" },
    questionable: { zh: "存疑", en: "Questionable" },
    poor: { zh: "较差", en: "Poor" },
    critical: { zh: "严重", en: "Critical" },
  };
  return en ? map[s].en : map[s].zh;
}

function readinessStatus(gateResult: ReturnType<typeof evaluateGates>, score: number, en: boolean): {
  label: string;
  level: "ready" | "review" | "not_ready";
} {
  const { gates, allPassed } = gateResult;
  const failedGates = gates.filter(g => !g.passed);

  // CRITICAL gate failure → NOT READY immediately
  if (failedGates.some(g => g.severity === "critical")) {
    return { label: en ? "NOT READY" : "未就绪", level: "not_ready" };
  }

  // Two or more poor failures → NOT READY
  const poorCount = failedGates.filter(g => g.severity === "poor").length;
  if (poorCount >= 2) {
    return { label: en ? "NOT READY" : "未就绪", level: "not_ready" };
  }

  // Any questionable or poor → REVIEW REQUIRED
  if (!allPassed) {
    return { label: en ? "REVIEW REQUIRED" : "建议审阅", level: "review" };
  }

  // All gates pass: score provides nuance
  if (score >= 80) return { label: en ? "READY" : "就绪", level: "ready" };
  if (score >= 60) return { label: en ? "REVIEW REQUIRED" : "建议审阅", level: "review" };
  return { label: en ? "NOT READY" : "未就绪", level: "not_ready" };
}

function statusColor(level: "ready" | "review" | "not_ready"): string {
  if (level === "ready") return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (level === "review") return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function scoreCategory(score: number, en: boolean): string {
  if (score >= 90) return en ? "Excellent" : "优秀";
  if (score >= 80) return en ? "Ready" : "就绪";
  if (score >= 70) return en ? "Mostly Ready" : "基本就绪";
  if (score >= 60) return en ? "Review Recommended" : "建议审阅";
  return en ? "Not Ready" : "未就绪";
}

function evaluateGates(
  reliability: AnalysisResults["reliability"],
  validity: AnalysisResults["validity"],
  missingRate: number,
  sampleSize: number,
  consistencyReport: ReturnType<typeof computeScaleConsistency> | null,
  en: boolean
): { gates: Gate[]; allPassed: boolean } {
  const dims = reliability.dimensions ?? [];
  const gates: Gate[] = [];

  // Reliability gate: at least 50% scales α >= .70
  if (dims.length > 0) {
    const passing = dims.filter(d => d.cronbachsAlpha >= 0.70).length;
    const ratio = passing / dims.length;
    const worstAlpha = Math.min(...dims.map(d => d.cronbachsAlpha));
    const meanAlpha = dims.reduce((s, d) => s + d.cronbachsAlpha, 0) / dims.length;
    const passed = ratio >= 0.50;
    const sev: GateSeverity =
      meanAlpha >= 0.90 ? "excellent" : meanAlpha >= 0.80 ? "good" :
      ratio >= 0.50 ? "acceptable" : worstAlpha < 0.50 ? "critical" :
      worstAlpha < 0.60 ? "poor" : "questionable";
    gates.push({
      name: "reliability",
      labelZh: "信度",
      labelEn: "Reliability",
      passed,
      severity: sev,
      detail: en
        ? `${passing}/${dims.length} scales α ≥ .70 (mean α = ${meanAlpha.toFixed(2)}) — ${severityLabel(sev, en)}${passed ? "" : " (requires ≥ 50%)"}.`
        : `${passing}/${dims.length} 个量表 α ≥ .70 (均值 α = ${meanAlpha.toFixed(2)}) — ${severityLabel(sev, en)}${passed ? "" : "（需要 ≥ 50%）"}。`,
    });
  } else if (reliability.cronbachsAlpha > 0) {
    const a = reliability.cronbachsAlpha;
    const passed = a >= 0.70;
    const sev: GateSeverity = a >= 0.90 ? "excellent" : a >= 0.80 ? "good" : a >= 0.70 ? "acceptable" : a >= 0.60 ? "questionable" : a >= 0.50 ? "poor" : "critical";
    gates.push({
      name: "reliability",
      labelZh: "信度",
      labelEn: "Reliability",
      passed,
      severity: sev,
      detail: en ? `α = ${a.toFixed(2)} — ${severityLabel(sev, en)}${passed ? "" : " (below .70)"}.` : `α = ${a.toFixed(2)} — ${severityLabel(sev, en)}${passed ? "" : "（低于 .70）"}。`,
    });
  }

  // Factor analysis gate
  if (validity.kmo > 0) {
    const kmo = validity.kmo;
    const bartOk = validity.bartlettPValue < 0.05;
    const passed = kmo >= 0.60 && bartOk;
    const sev: GateSeverity =
      kmo >= 0.90 ? "excellent" : kmo >= 0.80 ? "good" : kmo >= 0.60 ? "acceptable" :
      kmo < 0.50 ? "critical" : kmo < 0.60 ? "poor" : !bartOk ? "questionable" : "acceptable";
    gates.push({
      name: "factor",
      labelZh: "因子分析",
      labelEn: "Factor Analysis",
      passed,
      severity: sev,
      detail: en
        ? `KMO = ${kmo.toFixed(2)}, Bartlett ${validity.bartlettPValue < 0.001 ? "p < .001" : `p = ${validity.bartlettPValue.toFixed(3)}`} — ${severityLabel(sev, en)}.`
        : `KMO = ${kmo.toFixed(2)}, Bartlett ${validity.bartlettPValue < 0.001 ? "p < .001" : `p = ${validity.bartlettPValue.toFixed(3)}`} — ${severityLabel(sev, en)}。`,
    });
  }

  // Structure consistency gate (only in multi-scale mode)
  if (consistencyReport) {
    const ac = consistencyReport.overview.averageConsistency;
    const reviewCount = consistencyReport.overview.reviewCount;
    const passed = ac >= 0.70;
    const sev: GateSeverity =
      ac >= 0.90 ? "excellent" : ac >= 0.80 ? "good" : ac >= 0.70 ? "acceptable" :
      ac >= 0.60 ? "questionable" : ac >= 0.50 ? "poor" : "critical";
    gates.push({
      name: "consistency",
      labelZh: "结构一致性",
      labelEn: "Structure Consistency",
      passed,
      severity: sev,
      detail: en
        ? `${(ac * 100).toFixed(0)}% consistency, ${reviewCount} scale(s) need review — ${severityLabel(sev, en)}.`
        : `一致性 ${(ac * 100).toFixed(0)}%，${reviewCount} 个量表需审阅 — ${severityLabel(sev, en)}。`,
    });
  }

  // Missing data gate
  if (missingRate >= 0) {
    const mr = missingRate;
    const passed = mr < 0.30;
    const sev: GateSeverity =
      mr < 0.05 ? "excellent" : mr < 0.10 ? "good" : mr < 0.20 ? "acceptable" :
      mr >= 0.50 ? "critical" : mr >= 0.30 ? "poor" : "questionable";
    gates.push({
      name: "missing",
      labelZh: "缺失数据",
      labelEn: "Missing Data",
      passed,
      severity: sev,
      detail: en
        ? `Missing rate = ${(mr * 100).toFixed(0)}% — ${severityLabel(sev, en)}${passed ? "" : " (fails > 30%)"}.`
        : `缺失率 = ${(mr * 100).toFixed(0)}% — ${severityLabel(sev, en)}${passed ? "" : "（超过 30% 门槛）"}。`,
    });
  }

  // Sample size — warning only (not a gate)
  if (sampleSize > 0) {
    const sev: GateSeverity = sampleSize >= 300 ? "excellent" : sampleSize >= 100 ? "acceptable" : sampleSize >= 30 ? "questionable" : "critical";
    gates.push({
      name: "sample",
      labelZh: "样本量",
      labelEn: "Sample Size",
      passed: true, // Never fails readiness — warning only
      severity: sev,
      detail: en
        ? `N = ${sampleSize} — ${severityLabel(sev, en)}${sampleSize < 100 ? ". Results may be unstable." : ""}`
        : `N = ${sampleSize} — ${severityLabel(sev, en)}${sampleSize < 100 ? "，结果可能不稳定" : ""}。`,
    });
  }

  return { gates, allPassed: gates.filter(g => g.name !== "sample").every(g => g.passed) };
}

export function OverviewDashboard({ results }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const design = useAppStore((s) => s.researchDesign);
  const columns = useAppStore((s) => s.columns);
  const { reliability, validity, stability, meta, efa } = results;
  const allVars = [...(design?.outcomeVariables ?? []), ...(design?.predictorVariables ?? [])];
  const { composites } = useMemo(() => resolveSelectedVars(allVars), [allVars]);

  // Analysis scope + scoped missing rate
  const scope = useMemo(
    () => buildAnalysisScope(columns, design ? { outcomeVariables: design.outcomeVariables, predictorVariables: design.predictorVariables } : null),
    [columns, design]
  );
  const missingRate = useMemo(() => scopedMissingRate(columns, scope), [columns, scope]);

  // Debug: scope summary
  if (typeof window !== "undefined") {
    console.log("[AnalysisScope]", {
      mode: scope.hasUserSelection ? "curated" : "automatic",
      included: scope.scopeItemNames.size,
      excluded: columns.length - scope.scopeItemNames.size,
      metadata: scope.excludedColumns.slice(0, 10),
    });
  }

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
  const analysisMode = detectAnalysisMode(design ? { outcomeVariables: design.outcomeVariables, predictorVariables: design.predictorVariables } : null);
  const isSingleScale = analysisMode === "single";
  const isExploratory = analysisMode === "exploratory";

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

  // LAYER 1: Quality gates (severity-weighted)
  const { gates, allPassed } = useMemo(
    () => evaluateGates(reliability, validity, missingRate, meta.sampleSize, consistencyReport, en),
    [reliability, validity, missingRate, meta.sampleSize, consistencyReport, en]
  );
  const failedGates = gates.filter(g => !g.passed);

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
    else if (stability.stabilityLevel === "unstable") score += 2;
    // null = not assessed, add nothing

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

  const gateResult = { gates, allPassed };
  const status = readinessStatus(gateResult, readinessScore, en);
  const statusCls = statusColor(status.level);
  const sc = scoreCategory(readinessScore, en);

  // Item risk scan
  const riskReport = useMemo(
    () => scanItemRisks(results, columns, composites, en),
    [results, columns, composites, en]
  );

  // Recommended actions
  const actions = useMemo((): { text: string; priority: "high" | "medium" | "low" }[] => {
    const result: { text: string; priority: "high" | "medium" | "low" }[] = [];

    // Failed gates first
    for (const g of failedGates) {
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
  }, [failedGates, failingScales, weakItems, overlapPairs, redundancyPairs, meta.sampleSize, en]);

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
          <p className="text-xs opacity-80">{status.label} · {sc}</p>
          {!allPassed && (
            <p className="text-[10px] opacity-60 mt-0.5">
              {en ? `${failedGates.length} gate(s) failed` : `${failedGates.length} 个门槛未通过`}
            </p>
          )}
        </div>
      </div>

      {/* Single-scale / exploratory notice */}
      {(isSingleScale || isExploratory) && (
        <div className="rounded-lg bg-blue-50/30 border border-blue-100/50 p-3 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-[11px] text-blue-600/80">
            {isSingleScale
              ? (en
                ? "Single-scale questionnaire detected. The current data contains only one construct, so construct relationship analysis and scale structure consistency checks are not applicable. The system will focus on reliability, factor structure, and statistical stability."
                : "检测为单量表问卷。当前数据仅包含一个构念，因此构念关系分析与量表结构一致性检查不适用。系统将重点评估信度、因子结构与结果稳定性。")
              : (en
                ? "Exploratory analysis mode. No scale or construct definitions have been found. The system will focus on item relationships, latent factor structure, and data quality to help identify potential scale structures."
                : "检测为探索性分析模式。尚未定义量表或构念结构。系统将重点分析题项关系、潜在因子结构与数据质量，以帮助识别可能的量表结构。")}
          </p>
        </div>
      )}

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

      {/* Analysis Scope Transparency Card */}
      <div className="rounded-lg bg-card border border-border p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Info className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} />
          <span className="text-xs font-medium">{en ? "Analysis Scope" : "分析范围"}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <span className="text-muted-foreground">{en ? "Total Columns: " : "总列数: "}</span>
            <span className="text-foreground font-semibold">{columns.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{en ? "Included: " : "已纳入: "}</span>
            <span className="text-emerald-600 font-semibold">{scope.scopeItemNames.size}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{en ? "Excluded: " : "已排除: "}</span>
            <span className="text-amber-600 font-semibold">{columns.length - scope.scopeItemNames.size}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
            {scope.hasUserSelection
              ? (en ? "Custom Mode — based on selected variables and defined scales" : "自定义模式 — 基于已选变量与定义的量表")
              : (en ? "Quick Mode — auto-detected survey items, metadata excluded" : "快速模式 — 自动识别问卷题项，已排除元数据列")}
          </span>
          {scope.excludedColumns.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100" title={scope.excludedColumns.slice(0, 10).join(", ")}>
              {en ? `${scope.excludedColumns.length} metadata columns filtered` : `${scope.excludedColumns.length} 个元数据列已过滤`}
            </span>
          )}
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
          <p className={`text-base font-semibold ${missingRate >= 0.30 ? "text-red-500" : missingRate >= 0.20 ? "text-amber-500" : ""}`}>
            {missingRate >= 0 ? `${(missingRate * 100).toFixed(0)}%` : "—"}
          </p>
        </div>
        {riskReport.totalRisky > 0 && (
          <div className="col-span-2 px-3 py-2 rounded-lg bg-amber-50/30 border border-amber-100/50">
            <p className="text-[10px] text-muted-foreground">{en ? "Problematic Items" : "问题题项"}</p>
            <p className="text-base font-semibold text-amber-600">
              {riskReport.totalRisky}
              {riskReport.topItem && (
                <span className="text-[10px] text-amber-500/70 ml-1 font-normal">
                  — {riskReport.topItem.item}{riskReport.topItem.scale ? ` (${riskReport.topItem.scale})` : ""}
                </span>
              )}
            </p>
          </div>
        )}
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
        {stability.stabilityLevel == null ? (
          <span className="text-[11px] text-muted-foreground">{en ? "Unavailable" : "不可用"}</span>
        ) : (
          <span className={`text-[11px] ${stability.stabilityLevel === "stable" ? "text-emerald-600" : stability.stabilityLevel === "moderate" ? "text-amber-600" : "text-red-500"}`}>
            {stability.stabilityLevel === "stable"
              ? (en ? "Stable" : "稳定")
              : stability.stabilityLevel === "moderate"
                ? (en ? "Moderate" : "中等")
                : (en ? "Unstable" : "不稳定")}
            {stability.recommendedSampleSize != null && stability.recommendedSampleSize > 0 && ` (N ≥ ${stability.recommendedSampleSize})`}
          </span>
        )}
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
