"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import type { AnalysisResults, ValidationFlag } from "@/types";
import { CheckCircle2, AlertTriangle, XCircle, Shield, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  results: AnalysisResults;
}

interface MetricGauge {
  value: number;
  label: string;
  interpretation: string;
  grade: "good" | "moderate" | "poor";
}

function interpretAlpha(alpha: number): MetricGauge {
  if (alpha >= 0.9) return { value: alpha, label: "Cronbach's α", interpretation: "优秀", grade: "good" };
  if (alpha >= 0.8) return { value: alpha, label: "Cronbach's α", interpretation: "良好", grade: "good" };
  if (alpha >= 0.7) return { value: alpha, label: "Cronbach's α", interpretation: "可接受", grade: "moderate" };
  return { value: alpha, label: "Cronbach's α", interpretation: "偏低", grade: "poor" };
}

function interpretKMO(kmo: number): MetricGauge {
  if (kmo >= 0.8) return { value: kmo, label: "KMO", interpretation: "良好", grade: "good" };
  if (kmo >= 0.6) return { value: kmo, label: "KMO", interpretation: "可接受", grade: "moderate" };
  return { value: kmo, label: "KMO", interpretation: "不足", grade: "poor" };
}

function interpretStability(level: string): MetricGauge {
  if (level === "stable") return { value: 1.0, label: "样本稳定性", interpretation: "稳定", grade: "good" };
  if (level === "moderate") return { value: 0.5, label: "样本稳定性", interpretation: "中等", grade: "moderate" };
  return { value: 0.0, label: "样本稳定性", interpretation: "不稳定", grade: "poor" };
}

function computeQualityScore(alpha: number, kmo: number, stabilityLevel: string): number {
  let score = 0;
  // Alpha (weight: 40%)
  if (alpha >= 0.9) score += 40;
  else if (alpha >= 0.8) score += 35;
  else if (alpha >= 0.7) score += 25;
  else if (alpha >= 0.6) score += 15;
  else score += 5;

  // KMO (weight: 30%)
  if (kmo >= 0.9) score += 30;
  else if (kmo >= 0.8) score += 25;
  else if (kmo >= 0.7) score += 18;
  else if (kmo >= 0.6) score += 10;
  else score += 3;

  // Stability (weight: 30%)
  if (stabilityLevel === "stable") score += 30;
  else if (stabilityLevel === "moderate") score += 18;
  else score += 5;

  return Math.round(score);
}

const gradeConfig = {
  good: { color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200", icon: CheckCircle2 },
  moderate: { color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", icon: AlertTriangle },
  poor: { color: "text-red-600", bg: "bg-red-50", ring: "ring-red-200", icon: XCircle },
};

export function OverviewDashboard({ results }: Props) {
  const { reliability, validity, stability, meta, efa } = results;
  const validationReport = useAppStore((s) => s.validationReport);

  const qualityScore = computeQualityScore(
    reliability.cronbachsAlpha,
    validity.kmo,
    stability.stabilityLevel
  );

  const scoreLabel =
    qualityScore >= 80 ? "优秀" : qualityScore >= 60 ? "良好" : qualityScore >= 40 ? "尚可" : "需优化";

  const scoreColor =
    qualityScore >= 80 ? "text-emerald-600" : qualityScore >= 60 ? "text-blue-600" : qualityScore >= 40 ? "text-amber-600" : "text-red-500";

  const metrics: MetricGauge[] = [
    interpretAlpha(reliability.cronbachsAlpha),
    interpretKMO(validity.kmo),
    interpretStability(stability.stabilityLevel),
  ];

  // Bartlett significance
  const bartlettSig = validity.bartlettPValue < 0.001
    ? "p < .001"
    : validity.bartlettPValue < 0.05
      ? `p = ${validity.bartlettPValue.toFixed(3)}`
      : `p = ${validity.bartlettPValue.toFixed(3)} (不显著)`;

  return (
    <div className="space-y-5">
      {/* Quality score */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-card border border-border">
          <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-secondary/50">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="6"
              />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke={
                  qualityScore >= 80 ? "#059669" :
                  qualityScore >= 60 ? "#2563EB" :
                  qualityScore >= 40 ? "#D97706" : "#EF4444"
                }
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(qualityScore / 100) * 176} 176`}
              />
            </svg>
            <span className={`absolute text-lg font-bold ${scoreColor}`}>
              {qualityScore}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">综合质量评分</p>
            <p className={`text-xs ${scoreColor}`}>{scoreLabel}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              基于 α · KMO · 样本稳定性加权
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground">样本量</p>
            <p className="text-base font-semibold text-foreground">{meta.sampleSize}</p>
            {stability.recommendedSampleSize > meta.sampleSize && (
              <p className="text-[9px] text-amber-500">建议 ≥ {stability.recommendedSampleSize}</p>
            )}
          </div>
          <div className="px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground">题项数</p>
            <p className="text-base font-semibold text-foreground">{meta.itemCount}</p>
            <p className="text-[9px] text-muted-foreground">
              {efa.suggestedFactors} 因子
            </p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground">Bartlett</p>
            <p className="text-xs font-medium text-foreground">{bartlettSig}</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground">旋转方法</p>
            <p className="text-xs font-medium text-foreground capitalize">
              {efa.rotation}
            </p>
            <p className="text-[9px] text-muted-foreground">
              累计解释 {(efa.varianceExplained.reduce((a, b) => a + b, 0) * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Confidence Score (Layer 2 — Validation Engine) */}
      {validationReport && (
        <div className="px-4 py-3 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-xs font-medium text-foreground">数据可信度评估</span>
            </div>
            <span className={`text-xs font-semibold ${
              validationReport.confidence.level === "HIGH" ? "text-emerald-600" :
              validationReport.confidence.level === "MEDIUM" ? "text-blue-600" :
              validationReport.confidence.level === "LOW" ? "text-amber-600" : "text-red-500"
            }`}>
              {validationReport.confidence.level === "HIGH" ? "高" :
               validationReport.confidence.level === "MEDIUM" ? "中" :
               validationReport.confidence.level === "LOW" ? "低" : "不可靠"} · {validationReport.confidence.overall.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {([
              { label: "数据质量", value: validationReport.confidence.dataQuality },
              { label: "信度", value: validationReport.confidence.reliability },
              { label: "效度", value: validationReport.confidence.validity },
              { label: "因子稳定性", value: validationReport.confidence.factorStability },
            ] as const).map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="h-1.5 rounded-full bg-secondary mb-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      value >= 0.80 ? "bg-emerald-400" :
                      value >= 0.60 ? "bg-blue-400" :
                      value >= 0.40 ? "bg-amber-400" : "bg-red-400"
                    }`}
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{label}</span>
                <span className="text-[10px] text-foreground font-medium ml-1">{value.toFixed(2)}</span>
              </div>
            ))}
          </div>
          {/* Validation flags summary — expandable */}
          {validationReport.flags.length > 0 && (
            <ValidationFlagsList flags={validationReport.flags} />
          )}
        </div>
      )}

      {/* Metric gauges */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((metric) => {
          const config = gradeConfig[metric.grade];
          const Icon = config.icon;
          const pct = metric.value * 100;
          return (
            <div
              key={metric.label}
              className={`px-3 py-3 rounded-xl border ${config.bg} ${config.ring} ring-1`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={`w-3.5 h-3.5 ${config.color}`} strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-foreground">{metric.label}</span>
              </div>
              <p className="text-xl font-semibold text-foreground tracking-tight">
                {metric.label === "样本稳定性"
                  ? metric.interpretation
                  : metric.value.toFixed(3)}
              </p>
              <p className={`text-[10px] ${config.color}`}>{metric.interpretation}</p>
              {/* Mini bar */}
              <div className="mt-2 h-1 rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full ${metric.grade === "good" ? "bg-emerald-400" : metric.grade === "moderate" ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Method recommendations */}
      {results.recommendedMethod && (
        <div className="px-4 py-3 rounded-lg bg-blue-50/40 border border-blue-100/50">
          <p className="text-[11px] font-medium text-blue-700 mb-1">统计方法建议</p>
          <p className="text-xs text-blue-600/80">{results.recommendedMethod}</p>
        </div>
      )}
    </div>
  );
}

function ValidationFlagsList({ flags }: { flags: ValidationFlag[] }) {
  const [expanded, setExpanded] = useState(false);

  const errors = flags.filter((f) => f.type === "error");
  const warnings = flags.filter((f) => f.type === "warning");
  const infos = flags.filter((f) => f.type === "info");

  const typeConfig = {
    error: { dot: "bg-red-400", text: "text-red-600", bg: "bg-red-50/50", border: "border-red-100", label: "错误" },
    warning: { dot: "bg-amber-400", text: "text-amber-600", bg: "bg-amber-50/50", border: "border-amber-100", label: "警告" },
    info: { dot: "bg-blue-400", text: "text-blue-600", bg: "bg-blue-50/50", border: "border-blue-100", label: "提示" },
  };

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          {errors.length > 0 && <span className="text-red-500">{errors.length} 错误</span>}
          {warnings.length > 0 && <span className="text-amber-500">{warnings.length} 警告</span>}
          {infos.length > 0 && <span>{infos.length} 提示</span>}
        </div>
        {expanded ? (
          <ChevronUp className="w-3 h-3" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
        )}
      </button>

      {expanded && (
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {[...errors, ...warnings, ...infos].map((flag, i) => {
            const config = typeConfig[flag.type];
            return (
              <div
                key={i}
                className={`flex items-start gap-1.5 px-2 py-1.5 rounded text-[10px] ${config.bg} border ${config.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shrink-0 mt-1`} />
                <div className="min-w-0">
                  <span className={`font-medium ${config.text}`}>[{flag.code}]</span>{" "}
                  <span className="text-foreground/80">{flag.message}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

