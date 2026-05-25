"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { runDiagnostics } from "@/lib/analysis/diagnostic-engine";
import type { DiagnosticReport } from "@/lib/analysis/diagnostic-engine";
import { Shield, AlertTriangle, CheckCircle2, XCircle, BarChart3 } from "lucide-react";

export function DiagnosticDashboard() {
  const columns = useAppStore((s) => s.columns);
  const results = useAppStore((s) => s.results);
  const lang = useAppStore((s) => s.reportLanguage);

  const report = useMemo(
    () => runDiagnostics(columns, results),
    [columns, results]
  );

  if (columns.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Confidence bar */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
        <Shield className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-semibold text-foreground">数据诊断报告</p>
          <p className="text-xs text-muted-foreground">
            数据可信度 {report.confidence}% · {report.data_quality.sample_size} 样本
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            report.confidence >= 75 ? "bg-emerald-50 text-emerald-600" :
            report.confidence >= 50 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
          }`}>
            {report.confidence >= 75 ? (lang === "en" ? "Good" : "良好") : report.confidence >= 50 ? (lang === "en" ? "Caution" : "注意") : (lang === "en" ? "Warning" : "需关注")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Data Quality */}
        <QualityCard report={report} />
        {/* Scale Health */}
        <ScaleHealthCard report={report} />
        {/* Validity */}
        <ValidityCard report={report} />
        {/* Permissions */}
        <PermissionsCard report={report} />
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="px-4 py-3 rounded-xl bg-card border border-border space-y-2">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />
            建议与风险提示
          </p>
          {report.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                r.severity === "warning" ? "bg-amber-400" : "bg-blue-400"
              }`} />
              <div>
                <span className="text-foreground font-medium">{r.issue}</span>
                <span className="text-muted-foreground"> — {r.fix}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QualityCard({ report }: { report: DiagnosticReport }) {
  const dq = report.data_quality;
  return (
    <div className="p-3 rounded-lg bg-card border border-border space-y-2">
      <div className="flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-xs font-medium text-foreground">数据质量</span>
      </div>
      <div className="space-y-1 text-[10px]">
        <Row label="缺失率" value={`${(dq.missing_rate * 100).toFixed(1)}%`}
          ok={dq.missing_rate < 0.05} warn={dq.missing_rate >= 0.05 && dq.missing_rate < 0.15} />
        <Row label="样本量" value={`N = ${dq.sample_size}`}
          ok={dq.sample_adequacy === "adequate"} warn={dq.sample_adequacy === "marginal"} />
      </div>
    </div>
  );
}

function ScaleHealthCard({ report }: { report: DiagnosticReport }) {
  const sh = report.scale_health;
  if (sh.reliability_status === "not_applicable") return null;
  return (
    <div className="p-3 rounded-lg bg-card border border-border space-y-2">
      <div className="flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-xs font-medium text-foreground">量表健康度</span>
      </div>
      <div className="space-y-1 text-[10px]">
        <Row label="Cronbach's α" value={sh.cronbach_alpha.toFixed(3)}
          ok={sh.reliability_status === "good"} warn={sh.reliability_status === "acceptable"} />
        {sh.problem_items.length > 0 && (
          <p className="text-amber-600">问题题项: {sh.problem_items.slice(0, 3).join(", ")}</p>
        )}
      </div>
    </div>
  );
}

function ValidityCard({ report }: { report: DiagnosticReport }) {
  const v = report.validity;
  if (v.factorability === "not_applicable") return null;
  return (
    <div className="p-3 rounded-lg bg-card border border-border space-y-2">
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-xs font-medium text-foreground">效度适配</span>
      </div>
      <div className="space-y-1 text-[10px]">
        <Row label="KMO" value={v.kmo.toFixed(3)}
          ok={v.factorability === "good"} warn={v.factorability === "acceptable"} />
        <p className="text-muted-foreground">{v.bartlett}</p>
      </div>
    </div>
  );
}

function PermissionsCard({ report }: { report: DiagnosticReport }) {
  const p = report;
  return (
    <div className="p-3 rounded-lg bg-card border border-border space-y-2">
      <div className="flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-xs font-medium text-foreground">推荐分析</span>
      </div>
      <div className="space-y-1 text-[10px]">
        {report.allowed_analysis.slice(0, 4).map((a: string) => (
          <span key={a} className="inline-flex items-center gap-1 text-emerald-600 mr-2">
            <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} /> {a}
          </span>
        ))}
        {report.blocked_analysis.slice(0, 2).map((b: string) => (
          <span key={b} className="inline-flex items-center gap-1 text-red-400 mr-2">
            <XCircle className="w-3 h-3" strokeWidth={1.5} /> {b}
          </span>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, ok, warn }: { label: string; value: string; ok: boolean; warn: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${ok ? "text-emerald-600" : warn ? "text-amber-600" : "text-red-500"}`}>
        {value}
      </span>
    </div>
  );
}
