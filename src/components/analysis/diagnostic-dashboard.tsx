"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { runDiagnostics } from "@/lib/analysis/diagnostic-engine";
import type { DiagnosticReport } from "@/lib/analysis/diagnostic-engine";
import { Shield, AlertTriangle, CheckCircle2, XCircle, BarChart3, Zap } from "lucide-react";

export function DiagnosticDashboard() {
  const columns = useAppStore((s) => s.columns);
  const results = useAppStore((s) => s.results);
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";

  const report = useMemo(() => runDiagnostics(columns, results), [columns, results]);
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
        <ScoreBar label={en ? "Scale" : "量表"} score={report.scale_quality.score} weight="40%" />
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
          {report.recommendations.slice(0, 3).map((r, i) => (
            <div key={`rec-${i}`} className="flex items-start gap-2 text-[10px] ml-3.5">
              <span className="text-muted-foreground">→</span>
              <span className="text-muted-foreground">{r.fix}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, score, weight, invert }: { label: string; score: number; weight: string; invert?: boolean }) {
  const color = invert
    ? (score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-amber-400" : "bg-red-400")
    : (score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-blue-400" : score >= 40 ? "bg-amber-400" : "bg-red-400");
  return (
    <div className="text-center">
      <div className="flex items-end gap-0.5 mb-1">
        <div className="flex-1 h-8 rounded-sm bg-secondary relative overflow-hidden">
          <div className={`absolute bottom-0 w-full ${color} rounded-sm transition-all`} style={{ height: `${score}%` }} />
        </div>
      </div>
      <p className="text-[10px] font-medium text-foreground">{score}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className="text-[8px] text-muted-foreground/60">{weight}</p>
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
