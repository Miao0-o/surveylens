"use client";

import { useAppStore } from "@/lib/store";
import { AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo } from "react";

interface DetectedIssue {
  column: string;
  reason: string;
  severity: "high" | "medium" | "low";
  detail: string;
}

export function ReverseDetector() {
  const rawData = useAppStore((s) => s.rawData);
  const likertColumns = useAppStore((s) => s.likertColumns);
  const reverseItemWarnings = useAppStore((s) => s.reverseItemWarnings);
  const [isExpanded, setIsExpanded] = useState(false);

  // Rule-based detection: check for negative correlations between Likert items
  const detectedIssues = useMemo((): DetectedIssue[] => {
    if (!rawData || likertColumns.length < 2) return [];

    const issues: DetectedIssue[] = [];
    const likertValues: Record<string, number[]> = {};

    // Extract numeric values for each Likert column
    for (const col of likertColumns) {
      likertValues[col] = rawData.rows
        .map((r) => {
          const v = Number(r[col]);
          return isNaN(v) ? NaN : v;
        })
        .filter((v) => !isNaN(v));
    }

    // Check pairwise negative correlations (simplified Pearson-like check)
    const cols = Object.keys(likertValues);
    for (let i = 0; i < cols.length; i++) {
      for (let j = i + 1; j < cols.length; j++) {
        const a = cols[i];
        const b = cols[j];
        const valsA = likertValues[a];
        const valsB = likertValues[b];
        const n = Math.min(valsA.length, valsB.length);

        if (n < 5) continue;

        // Compute simple correlation
        const meanA = valsA.slice(0, n).reduce((s, v) => s + v, 0) / n;
        const meanB = valsB.slice(0, n).reduce((s, v) => s + v, 0) / n;
        let cov = 0;
        let varA = 0;
        let varB = 0;
        for (let k = 0; k < n; k++) {
          const da = valsA[k] - meanA;
          const db = valsB[k] - meanB;
          cov += da * db;
          varA += da * da;
          varB += db * db;
        }
        const r = varA > 0 && varB > 0 ? cov / Math.sqrt(varA * varB) : 0;

        // Flag strong negative correlations as potential reverse items
        if (r < -0.3) {
          issues.push({
            column: r < -0.5 ? a : b,
            reason: "negative_correlation",
            severity: r < -0.5 ? "high" : "medium",
            detail: `与 ${r < -0.5 ? b : a} 呈显著负相关 (r = ${r.toFixed(2)})，可能为反向题`,
          });
        }
      }
    }

    return issues;
  }, [rawData, likertColumns]);

  if (!rawData || likertColumns.length === 0) return null;

  const allIssues = [
    ...detectedIssues,
    ...reverseItemWarnings.map((w) => ({
      column: w.column,
      reason: w.reason,
      severity: w.confidence === "high" ? "high" as const : w.confidence === "medium" ? "medium" as const : "low" as const,
      detail: w.reason === "negative_correlation" ? "与同维度题项负相关" : w.reason === "semantic_opposite" ? "语义方向可能相反" : "题总相关异常偏低",
    })),
  ];

  const highIssues = allIssues.filter((i) => i.severity === "high");
  const mediumIssues = allIssues.filter((i) => i.severity === "medium");

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xs font-medium text-foreground"
      >
        <div className="flex items-center gap-1.5">
          反向题检测
          {highIssues.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-[9px] font-bold">
              {highIssues.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {allIssues.length === 0 ? (
            <div className="flex items-center gap-1.5 px-2 py-2 text-[11px] text-muted-foreground">
              <Info className="w-3 h-3 shrink-0" strokeWidth={1.5} />
              未检测到明显的反向题风险
            </div>
          ) : (
            <>
              {highIssues.map((issue, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-amber-50/60 border border-amber-100/60"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-[11px] font-medium text-amber-700">
                      {issue.column} 可能为反向题
                    </p>
                    <p className="text-[10px] text-amber-600/80 mt-0.5">
                      {issue.detail}
                    </p>
                  </div>
                </div>
              ))}
              {mediumIssues.map((issue, i) => (
                <div
                  key={`m-${i}`}
                  className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-blue-50/40 border border-blue-100/40"
                >
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-[11px] font-medium text-blue-600">
                      {issue.column} 需关注
                    </p>
                    <p className="text-[10px] text-blue-500/80 mt-0.5">
                      {issue.detail}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
          <p className="text-[10px] text-muted-foreground/70">
            系统自动检测 Likert 题项间的负相关关系。确认反向题后，分析时将自动反向计分。
          </p>
        </div>
      )}
    </div>
  );
}
