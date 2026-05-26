"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { runDiagnostics } from "@/lib/analysis/diagnostic-engine";
import type { DiagnosticReport } from "@/lib/analysis/diagnostic-engine";
import { Shield, AlertTriangle, CheckCircle2, XCircle, BarChart3, Zap, ArrowRight, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

export function DiagnosticDashboard() {
  const columns = useAppStore((s) => s.columns);
  const results = useAppStore((s) => s.results);
  const previousResults = useAppStore((s) => s.previousResults);
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";

  const repair = useAppStore((s) => s.repair);
  const setRepairAction = useAppStore((s) => s.setRepairAction);
  const setLeftStep = useAppStore((s) => s.setLeftStep);
  const dataWarnings = useAppStore((s) => s.dataWarnings);

  const mappingFreeze = useAppStore((s) => s.mappingFreeze);
  const report = useMemo(() => runDiagnostics(columns, results, lang, mappingFreeze?.stats ?? null), [columns, results, lang, mappingFreeze]);
  const prevReport = useMemo(() => previousResults ? runDiagnostics(columns, previousResults, lang) : null, [columns, previousResults, lang]);

  const comparison = useMemo(() => {
    if (!prevReport || !results) return null;
    return {
      alpha: { before: prevReport.scale_quality.cronbach_alpha, after: report.scale_quality.cronbach_alpha },
      kmo: { before: prevReport.factorability.kmo, after: report.factorability.kmo },
      readiness: { before: prevReport.readiness.score, after: report.readiness.score },
    };
  }, [prevReport, report, results]);
  if (columns.length === 0) return null;

  const levelConfig = {
    ready:    { color: "text-emerald-600", bg: "bg-emerald-50", en: "Ready", zh: "就绪" },
    partial:  { color: "text-amber-600", bg: "bg-amber-50", en: "Partial", zh: "部分就绪" },
    low:      { color: "text-orange-600", bg: "bg-orange-50", en: "Low", zh: "偏低" },
    not_ready:{ color: "text-red-600", bg: "bg-red-50", en: "Not Ready", zh: "未就绪" },
  };
  const lc = levelConfig[report.readiness.level];

  return (
    <div className="space-y-4">
      {/* Data integrity warnings */}
      {dataWarnings.length > 0 && (
        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
          {dataWarnings.map((w, i) => (
            <p key={i} className="text-[10px] text-amber-700 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
        <Shield className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {en ? "Data Readiness" : "数据准备度"}
          </p>
          <p className="text-xs text-muted-foreground">{report.readiness.label}</p>
        </div>
        <div className="ml-auto text-right">
          <p className={`text-lg font-bold ${lc.color}`}>{report.readiness.score}</p>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${lc.bg} ${lc.color}`}>
            {en ? lc.en : lc.zh}
          </span>
        </div>
      </div>

      {/* 4 sub-scores */}
      <div className="grid grid-cols-4 gap-2">
        <ScoreBar label={en ? "Scale" : "量表"} score={report.scale_quality.score} weight="40%" hint={report.scale_quality.reason} />
        <ScoreBar label={en ? "Data" : "数据"} score={report.data_quality.score} weight="30%" />
        <ScoreBar label={en ? "Factorability" : "因子适配"} score={report.factorability.score} weight="20%" />
        <ScoreBar label={en ? "Risk" : "风险"} score={report.technical_risk.score} weight="10%" invert />
      </div>

      {/* Readiness gates */}
      <div className="grid grid-cols-2 gap-3">
        <MiniCard icon={<BarChart3 className="w-3.5 h-3.5" />} title={en ? "Data Quality" : "数据质量"}>
          <p className="text-[10px]"><span className="text-muted-foreground">{en ? "Missing" : "缺失"} </span>
            <span className={`font-medium ${report.data_quality.missing_data.risk_level === "low" ? "text-emerald-600" : report.data_quality.missing_data.risk_level === "medium" ? "text-amber-600" : "text-red-500"}`}>
              {report.data_quality.missing_data.rate}%</span></p>
          <p className="text-[9px] text-muted-foreground/70 mt-0.5">{report.data_quality.missing_data.interpretation}</p>
          <p className="text-[10px] mt-1.5"><span className="text-muted-foreground">{en ? "Distribution" : "分布"} </span>
            <span className={`font-medium ${report.data_quality.response_distribution.risk_level === "low" ? "text-emerald-600" : "text-amber-600"}`}>
              {report.data_quality.response_distribution.status}</span></p>
          <p className="text-[9px] text-muted-foreground/70 mt-0.5">{report.data_quality.response_distribution.interpretation}</p>
          {report.data_quality.response_variability.risk_level !== "low" && (
            <p className="text-[10px] mt-1.5 text-amber-600">{report.data_quality.response_variability.interpretation}</p>
          )}
        </MiniCard>
        <MiniCard icon={<Shield className="w-3.5 h-3.5" />} title={en ? "Scale" : "量表"}>
          <Stat label="α" value={report.scale_quality.cronbach_alpha > 0 ? report.scale_quality.cronbach_alpha.toFixed(3) : "N/A"}
            ok={report.scale_quality.cronbach_alpha >= 0.80} warn={report.scale_quality.cronbach_alpha >= 0.70} />
          {report.scale_quality.reason && (
            <p className="text-[9px] text-muted-foreground/70 mt-0.5">{report.scale_quality.reason}</p>
          )}
          {report.scale_quality.reverse_item_risk.length > 0 && (
            <p className="text-[10px] text-red-500">{report.scale_quality.reverse_item_risk.length} {en ? "reverse risk" : "个反向题"}</p>
          )}
        </MiniCard>
        <MiniCard icon={<CheckCircle2 className="w-3.5 h-3.5" />} title={en ? "Factorability Assessment" : "因子分析适配性"}>
          <Stat label="KMO" value={report.factorability.kmo > 0 ? report.factorability.kmo.toFixed(3) : "N/A"}
            ok={report.factorability.kmo >= 0.80} warn={report.factorability.kmo >= 0.60} />
          <p className="text-[10px] text-muted-foreground">{report.factorability.kmo_interpretation}</p>
          <p className="text-[10px] text-muted-foreground">{report.factorability.bartlett}</p>
          {report.factorability.risk_level === "high" && (
            <p className="text-[10px] text-amber-600">{report.factorability.readiness}</p>
          )}
        </MiniCard>
        <MiniCard icon={<Zap className="w-3.5 h-3.5" />} title={en ? "Analysis Gates" : "分析准入"}>
          <Gate label={en ? "Descriptive" : "描述统计"} ok={report.readiness.descriptive} />
          <Gate label={en ? "Correlation" : "相关分析"} ok={report.readiness.correlation} />
          <Gate label={en ? "Regression" : "回归分析"} ok={report.readiness.regression} />
          <Gate label={en ? "Factor Analysis" : "因子分析"} ok={report.readiness.factor_analysis} />
        </MiniCard>
      </div>

      {/* Before/After Comparison */}
      {comparison && (comparison.alpha.before > 0 || comparison.kmo.before > 0) && (
        <div className="px-4 py-3 rounded-xl bg-card border border-border space-y-2">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" strokeWidth={1.5} />
            {en ? "Before → After" : "修复前 → 修复后"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {comparison.alpha.before > 0 && (
              <div className="text-center px-2 py-1.5 rounded bg-secondary/20">
                <p className="text-[9px] text-muted-foreground">Cronbach's α</p>
                <p className="text-[11px] font-semibold text-foreground">
                  <span className="text-muted-foreground/70">{comparison.alpha.before.toFixed(2)}</span>
                  <span className="mx-1 text-muted-foreground">→</span>
                  <span className={comparison.alpha.after > comparison.alpha.before ? "text-emerald-600" : comparison.alpha.after < comparison.alpha.before ? "text-red-500" : "text-foreground"}>
                    {comparison.alpha.after.toFixed(2)}
                  </span>
                  {comparison.alpha.after !== comparison.alpha.before && (
                    <span className={`text-[9px] ml-0.5 ${comparison.alpha.after > comparison.alpha.before ? "text-emerald-500" : "text-red-400"}`}>
                      {comparison.alpha.after > comparison.alpha.before ? "↑" : "↓"}
                      {Math.abs(comparison.alpha.after - comparison.alpha.before).toFixed(2)}
                    </span>
                  )}
                </p>
              </div>
            )}
            {comparison.kmo.before > 0 && (
              <div className="text-center px-2 py-1.5 rounded bg-secondary/20">
                <p className="text-[9px] text-muted-foreground">KMO</p>
                <p className="text-[11px] font-semibold text-foreground">
                  <span className="text-muted-foreground/70">{comparison.kmo.before.toFixed(2)}</span>
                  <span className="mx-1 text-muted-foreground">→</span>
                  <span className={comparison.kmo.after > comparison.kmo.before ? "text-emerald-600" : comparison.kmo.after < comparison.kmo.before ? "text-red-500" : "text-foreground"}>
                    {comparison.kmo.after.toFixed(2)}
                  </span>
                  {comparison.kmo.after !== comparison.kmo.before && (
                    <span className={`text-[9px] ml-0.5 ${comparison.kmo.after > comparison.kmo.before ? "text-emerald-500" : "text-red-400"}`}>
                      {comparison.kmo.after > comparison.kmo.before ? "↑" : "↓"}
                      {Math.abs(comparison.kmo.after - comparison.kmo.before).toFixed(2)}
                    </span>
                  )}
                </p>
              </div>
            )}
            <div className="text-center px-2 py-1.5 rounded bg-secondary/20">
              <p className="text-[9px] text-muted-foreground">{en ? "Readiness" : "准备度"}</p>
              <p className="text-[11px] font-semibold text-foreground">
                <span className="text-muted-foreground/70">{comparison.readiness.before}</span>
                <span className="mx-1 text-muted-foreground">→</span>
                <span className={comparison.readiness.after > comparison.readiness.before ? "text-emerald-600" : comparison.readiness.after < comparison.readiness.before ? "text-red-500" : "text-foreground"}>
                  {comparison.readiness.after}
                </span>
                {comparison.readiness.after !== comparison.readiness.before && (
                  <span className={`text-[9px] ml-0.5 ${comparison.readiness.after > comparison.readiness.before ? "text-emerald-500" : "text-red-400"}`}>
                    {comparison.readiness.after > comparison.readiness.before ? "↑" : "↓"}
                    {Math.abs(comparison.readiness.after - comparison.readiness.before)}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Risk Flags */}
      {report.risk_flags.length > 0 && (
        <div className="px-4 py-3 rounded-xl bg-card border border-border space-y-2">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />
            {en ? "Risks & Fixes" : "风险与修复建议"}
          </p>
          {report.risk_flags.slice(0, 4).map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${r.type === "error" ? "bg-red-400" : r.type === "warning" ? "bg-amber-400" : "bg-blue-400"}`} />
              <span className="text-foreground">{r.message}</span>
            </div>
          ))}
          {report.recommendations.slice(0, 3).map((r, i) => {
            const strColor = r.strength === "强推荐" ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                             r.strength === "建议" ? "text-amber-600 bg-amber-50 border-amber-100" :
                             "text-muted-foreground bg-secondary/30 border-border";
            const isReverse = r.action.includes("核实") || r.action.includes("Verify");
            const isMissing = r.action.includes("处理缺失") || r.action.includes("Handle missing");
            const isApplied = isReverse ? repair.appliedFixes.reverse : isMissing ? repair.appliedFixes.missing : repair.appliedFixes.weakItems;
            return (
              <div key={`rec-${i}`} className="flex flex-col gap-1 text-[10px] ml-3.5 py-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">→</span>
                  <span className="text-foreground font-medium">{r.recommendation}</span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-[9px] text-muted-foreground/60">{r.impact}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${strColor}`}>
                    {r.strength}
                  </span>
                  <button
                    onClick={() => {
                      setLeftStep("preprocess");
                      if (isMissing) setRepairAction("missing");
                      else if (isReverse) setRepairAction("reverse");
                      else setRepairAction(null);
                    }}
                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                      isApplied
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    {isApplied && <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={2} />}
                    {r.action}
                    {!isApplied && <ArrowRight className="w-2.5 h-2.5" />}
                  </button>
                </div>
              </div>
            );
          })}
          <button
            disabled={!repair.dirty}
            onClick={() => {
              useAppStore.getState().requestReRun();
            }}
            className={`w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-medium transition-colors ${
              repair.dirty
                ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                : "bg-muted/20 text-muted-foreground/40 border border-border cursor-not-allowed"
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            {repair.dirty
              ? (en ? "Re-run analysis with fixes applied" : "应用修复后重新分析")
              : (en ? "Apply fixes above to enable re-run" : "请先应用上方修复建议")}
          </button>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, score, weight, invert, hint }: { label: string; score: number; weight: string; invert?: boolean; hint?: string }) {
  const color = invert
    ? (score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-amber-400" : "bg-red-400")
    : (score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-blue-400" : score >= 40 ? "bg-amber-400" : "bg-red-400");
  return (
    <div className="text-center" title={hint}>
      <div className="flex items-end gap-0.5 mb-1">
        <div className="flex-1 h-8 rounded-sm bg-secondary relative overflow-hidden">
          <div className={`absolute bottom-0 w-full ${color} rounded-sm transition-all`} style={{ height: `${Math.max(score, 2)}%` }} />
        </div>
      </div>
      <p className="text-[10px] font-medium text-foreground">{score}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className="text-[8px] text-muted-foreground/60">{weight}</p>
      {score === 0 && hint && (
        <p className="text-[7px] text-amber-500/70 mt-0.5 leading-tight">{hint}</p>
      )}
    </div>
  );
}

function MiniCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-card border border-border space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-medium text-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${ok ? "text-emerald-600" : warn ? "text-amber-600" : "text-red-500"}`}>{value}</span>
    </div>
  );
}

function Gate({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      {ok ? <CheckCircle2 className="w-3 h-3 text-emerald-500" strokeWidth={2} /> : <XCircle className="w-3 h-3 text-red-300" strokeWidth={1.5} />}
      <span className={ok ? "text-foreground" : "text-muted-foreground/50"}>{label}</span>
    </div>
  );
}
