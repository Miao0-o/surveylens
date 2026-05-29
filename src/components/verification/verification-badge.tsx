"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { runSelfCheck } from "@/lib/verification/self-check";
import type { VerificationReport } from "@/lib/verification/self-check";
import { CheckCircle2, XCircle, Shield, Loader2 } from "lucide-react";

export function VerificationBadge() {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState(false);

  const run = () => {
    setLoading(true);
    setTimeout(() => {
      setReport(runSelfCheck());
      setLoading(false);
    }, 100);
  };

  useEffect(() => { run(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
        <span className="text-sm font-medium text-foreground">
          {en ? "Analysis Engine Verification" : "分析引擎验证"}
        </span>
        {report && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            report.verified ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          }`}>
            {report.passed}/{report.total} {en ? "passed" : "通过"}
          </span>
        )}
        <button
          onClick={run}
          className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : (en ? "Re-run" : "重跑")}
        </button>
      </div>

      {report && (
        <div className="space-y-1">
          {report.results.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              {r.passed ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" strokeWidth={1.5} />
              ) : (
                <XCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
              )}
              <div>
                <span className={r.passed ? "text-foreground" : "text-amber-600"}>
                  {r.passed ? "✓ " : "△ "}{r.name}
                </span>
                <p className="text-muted-foreground/60">{r.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/50">
        {en
          ? "Reference validation against R psych package and Jamovi. Target tolerance: |error| < .001 for key statistics."
          : "对照 R psych 包和 Jamovi 进行参考验证。关键统计量目标容差: |error| < .001。"}
      </p>
    </div>
  );
}
