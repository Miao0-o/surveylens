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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
        <Shield className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {en ? "Data Readiness Report" : "数据准备度报告"}
          </p>
          <p className="text-xs text-muted-foreground">
            {en ? "Readiness" : "准备度"} {report.readiness_score}% · {en ? "Confidence" : "可信度"} {report.confidence}%
          </p>
        </div>
        <div className="ml-auto">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            report.readiness_score >= 75 ? "bg-emerald-50 text-emerald-600" :
            report.readiness_score >= 50 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
          }`}>
            {report.readiness_score >= 75 ? (en ? "Ready" : "就绪") :
             report.readiness_score >= 50 ? (en ? "Caution" : "注意") : (en ? "Not Ready" : "未就绪")}
          </span>
        </div>
      </div>

      {/* 4-Card Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MiniCard icon={<BarChart3 className="w-3.5 h-3.5" />} title={en ? "Data Quality" : "数据质量"}>
          <Stat label={en ? "Missing" : "缺失"} value={report.data_quality.missing}
            ok={report.data_quality.missing === "low"} />
          <Stat label={en ? "Distribution" : "分布"} value={report.data_quality.distribution_risk} ok={true} />
        </MiniCard>

        <MiniCard icon={<Shield className="w-3.5 h-3.5" />} title={en ? "Scale Quality" : "量表质量"}>
          {report.scale_quality.cronbach_alpha > 0 ? (
            <>
              <Stat label="α" value={report.scale_quality.cronbach_alpha.toFixed(3)}
                ok={report.scale_quality.cronbach_alpha >= 0.80} warn={report.scale_quality.cronbach_alpha >= 0.70} />
              {report.scale_quality.problem_items.length > 0 && (
                <p className="text-[10px] text-amber-600">{report.scale_quality.problem_items.length} {en ? "weak items" : "个弱题项"}</p>
              )}
              {report.scale_quality.reverse_item_risk.length > 0 && (
                <p className="text-[10px] text-red-500">{report.scale_quality.reverse_item_risk.length} {en ? "reverse risks" : "个反向题风险"}</p>
              )}
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground">{en ? "Not yet assessed" : "尚未评估"}</p>
          )}
        </MiniCard>

        <MiniCard icon={<CheckCircle2 className="w-3.5 h-3.5" />} title={en ? "Validity" : "效度适配"}>
          {report.validity.kmo > 0 ? (
            <>
              <Stat label="KMO" value={report.validity.kmo.toFixed(3)}
                ok={report.validity.kmo >= 0.80} warn={report.validity.kmo >= 0.60} />
              <p className="text-[10px] text-muted-foreground">{report.validity.bartlett}</p>
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground">{en ? "Not yet assessed" : "尚未评估"}</p>
          )}
        </MiniCard>

        <MiniCard icon={<Zap className="w-3.5 h-3.5" />} title={en ? "Readiness" : "分析就绪"}>
          <div className="space-y-0.5 text-[10px]">
            <ReadyItem label={en ? "Descriptive" : "描述统计"} ok={report.readiness.descriptive} />
            <ReadyItem label={en ? "Correlation" : "相关分析"} ok={report.readiness.correlation} />
            <ReadyItem label={en ? "Regression" : "回归分析"} ok={report.readiness.regression} />
            <ReadyItem label={en ? "Factor Analysis" : "因子分析"} ok={report.readiness.factor_analysis} />
          </div>
        </MiniCard>
      </div>

      {/* Risk Flags + Recommendations */}
      {(report.risk_flags.length > 0 || report.recommendations.length > 0) && (
        <div className="px-4 py-3 rounded-xl bg-card border border-border space-y-2">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />
            {en ? "Risks & Recommendations" : "风险与建议"}
          </p>
          {report.risk_flags.slice(0, 4).map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${r.type === "error" ? "bg-red-400" : "bg-amber-400"}`} />
              <span className="text-foreground">{r.message}</span>
            </div>
          ))}
          {report.recommendations.slice(0, 3).map((r, i) => (
            <div key={`rec-${i}`} className="flex items-start gap-2 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0 bg-blue-400" />
              <span className="text-foreground font-medium">{r.issue}</span>
              <span className="text-muted-foreground">— {r.fix}</span>
            </div>
          ))}
        </div>
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

function ReadyItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {ok ? <CheckCircle2 className="w-3 h-3 text-emerald-500" strokeWidth={2} /> : <XCircle className="w-3 h-3 text-red-300" strokeWidth={1.5} />}
      <span className={ok ? "text-foreground" : "text-muted-foreground/50"}>{label}</span>
    </div>
  );
}
