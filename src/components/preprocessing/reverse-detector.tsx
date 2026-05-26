"use client";

import { useAppStore } from "@/lib/store";
import { Info, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useState, useMemo } from "react";

interface DetectedIssue {
  column: string;
  reason: string;
  severity: "high" | "medium" | "low";
  detail: string;
}

export function ReverseDetector() {
  const rawData = useAppStore((s) => s.rawData);
  const codebook = useAppStore((s) => s.codebook);
  const likertColumns = useAppStore((s) => s.likertColumns);
  const reverseItemWarnings = useAppStore((s) => s.reverseItemWarnings);
  const confirmedReverseItems = useAppStore((s) => s.confirmedReverseItems);
  const setConfirmedReverseItems = useAppStore((s) => s.setConfirmedReverseItems);
  const results = useAppStore((s) => s.results);
  const repair = useAppStore((s) => s.repair);
  const applyFix = useAppStore((s) => s.applyFix);
  const setRepairAction = useAppStore((s) => s.setRepairAction);
  const [isExpanded, setIsExpanded] = useState(false);

  const detectedIssues = useMemo((): DetectedIssue[] => {
    if (!rawData || likertColumns.length < 2) return [];

    const issues: DetectedIssue[] = [];
    const likertValues: Record<string, number[]> = {};

    for (const col of likertColumns) {
      likertValues[col] = rawData.rows
        .map((r) => {
          const v = Number(r[col]);
          return isNaN(v) ? NaN : v;
        })
        .filter((v) => !isNaN(v));
    }

    const cols = Object.keys(likertValues);
    for (let i = 0; i < cols.length; i++) {
      for (let j = i + 1; j < cols.length; j++) {
        const a = cols[i];
        const b = cols[j];
        const valsA = likertValues[a];
        const valsB = likertValues[b];
        const n = Math.min(valsA.length, valsB.length);

        if (n < 5) continue;

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

    // Add post-analysis item-total correlation results
    if (results) {
      for (const [item, corr] of Object.entries(results.reliability.itemTotalCorrelation)) {
        if (corr < 0 && !issues.some((i) => i.column === item)) {
          issues.push({
            column: item,
            reason: "negative_item_total",
            severity: "high",
            detail: `题总相关为负 (r = ${corr.toFixed(3)})，极可能为反向题`,
          });
        }
      }
    }

    return issues;
  }, [rawData, likertColumns, results]);

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

  // Deduplicate by column
  const seen = new Set<string>();
  const uniqueIssues = allIssues.filter((i) => {
    if (seen.has(i.column)) return false;
    seen.add(i.column);
    return true;
  });

  const highIssues = uniqueIssues.filter((i) => i.severity === "high");
  const mediumIssues = uniqueIssues.filter((i) => i.severity === "medium");

  const toggleReverse = (col: string) => {
    if (confirmedReverseItems.includes(col)) {
      setConfirmedReverseItems(confirmedReverseItems.filter((c) => c !== col));
    } else {
      setConfirmedReverseItems([...confirmedReverseItems, col]);
    }
  };

  const confirmedCount = confirmedReverseItems.length;

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
          {confirmedCount > 0 && (
            <span className="inline-flex items-center justify-center px-1 h-4 rounded-full bg-emerald-100 text-emerald-600 text-[9px] font-bold">
              {confirmedCount} 已确认
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
          {/* Codebook-confirmed reverse items */}
          {codebook && codebook.detectedReverseItems.length > 0 && (
            <div className="px-2.5 py-2 rounded-lg bg-blue-50/40 border border-blue-100/40">
              <p className="text-[11px] font-medium text-blue-600 mb-1">
                编码簿已标记 {codebook.detectedReverseItems.length} 个反向题：
              </p>
              <p className="text-[10px] text-blue-500/80">
                {codebook.detectedReverseItems.slice(0, 10).join(", ")}
                {codebook.detectedReverseItems.length > 10 ? " ..." : ""}
              </p>
              <p className="text-[10px] text-blue-500/70 mt-1">
                已在映射层自动完成反向变换 (max+min-val)
              </p>
            </div>
          )}

          {uniqueIssues.length === 0 ? (
            <div className="flex items-center gap-1.5 px-2 py-2 text-[11px] text-muted-foreground">
              <Info className="w-3 h-3 shrink-0" strokeWidth={1.5} />
              {codebook && codebook.detectedReverseItems.length > 0
                ? "编码簿已处理所有反向题，无需额外检测"
                : "未检测到明显的反向题风险"}
            </div>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground/70 px-1">
                勾选确认为反向题的题项，重新分析时将自动反向计分
              </p>
              {highIssues.map((issue, i) => (
                <label
                  key={i}
                  className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-amber-50/60 border border-amber-100/60 cursor-pointer hover:bg-amber-50"
                >
                  <input
                    type="checkbox"
                    checked={confirmedReverseItems.includes(issue.column)}
                    onChange={() => toggleReverse(issue.column)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-amber-700">
                      {issue.column} 确认为反向题
                    </p>
                    <p className="text-[10px] text-amber-600/80 mt-0.5">
                      {issue.detail}
                    </p>
                  </div>
                </label>
              ))}
              {mediumIssues.map((issue, i) => (
                <label
                  key={`m-${i}`}
                  className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-blue-50/40 border border-blue-100/40 cursor-pointer hover:bg-blue-50"
                >
                  <input
                    type="checkbox"
                    checked={confirmedReverseItems.includes(issue.column)}
                    onChange={() => toggleReverse(issue.column)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-blue-600">
                      {issue.column} 可能为反向题
                    </p>
                    <p className="text-[10px] text-blue-500/80 mt-0.5">
                      {issue.detail}
                    </p>
                  </div>
                </label>
              ))}
            </>
          )}

          {/* Apply button — only when repair workflow is active AND items confirmed */}
          {repair.currentAction === "reverse" && confirmedCount > 0 && !repair.appliedFixes.reverse && (
            <button
              onClick={() => {
                applyFix("reverse");
                setRepairAction(null);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              应用反向计分（{confirmedCount} 个题项）
            </button>
          )}
          {repair.appliedFixes.reverse && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-[11px] font-medium text-emerald-700">
                  已应用反向计分（{confirmedCount} 个题项）
                </p>
                <p className="text-[10px] text-emerald-600/80">
                  返回“概览”点击“应用修复后重新分析”
                </p>
              </div>
            </div>
          )}
          {/* Fallback: confirmed but no repair workflow active */}
          {confirmedCount > 0 && !repair.appliedFixes.reverse && repair.currentAction !== "reverse" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={1.5} />
              <p className="text-[11px] text-emerald-700">
                已标记 {confirmedCount} 个反向题。在“风险与修复建议”中点击“核实题项”完成应用。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
