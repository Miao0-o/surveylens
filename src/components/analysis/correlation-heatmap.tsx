"use client";

import type { ValidityResult } from "@/types";
import { useMemo, useState } from "react";

interface Props {
  data: ValidityResult;
}

function corrColor(r: number): string {
  const absR = Math.abs(r);
  if (r > 0) {
    // Positive: blue scale
    if (absR >= 0.8) return "rgb(30, 64, 175)";
    if (absR >= 0.6) return "rgb(59, 130, 246)";
    if (absR >= 0.4) return "rgb(147, 197, 253)";
    if (absR >= 0.2) return "rgb(219, 234, 254)";
    return "rgb(239, 246, 255)";
  } else {
    // Negative: red scale
    if (absR >= 0.8) return "rgb(153, 27, 27)";
    if (absR >= 0.6) return "rgb(239, 68, 68)";
    if (absR >= 0.4) return "rgb(252, 165, 131)";
    if (absR >= 0.2) return "rgb(254, 215, 204)";
    return "rgb(254, 242, 242)";
  }
}

function textColorForBg(r: number): string {
  return Math.abs(r) >= 0.6 ? "#FFFFFF" : "#1F2937";
}

export function CorrelationHeatmap({ data }: Props) {
  const { correlationMatrix, columnLabels } = data;
  const [showValues, setShowValues] = useState(true);

  // Truncate labels for display
  const labels = useMemo(
    () => columnLabels.map((l) => (l.length > 12 ? l.slice(0, 12) + "…" : l)),
    [columnLabels]
  );

  if (correlationMatrix.length === 0) return null;

  const maxItems = Math.min(20, correlationMatrix.length);
  const displayMatrix = correlationMatrix.slice(0, maxItems).map((row) => row.slice(0, maxItems));
  const displayLabels = labels.slice(0, maxItems);

  const cellSize = Math.max(26, Math.min(36, 480 / maxItems));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-foreground">相关矩阵热力图</p>
        <button
          onClick={() => setShowValues(!showValues)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showValues ? "隐藏数值" : "显示数值"}
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
        <span>-1.0</span>
        <div className="flex h-3 rounded overflow-hidden">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((r) => (
            <div key={`neg-${r}`} className="w-5 h-full" style={{ background: corrColor(-r) }} />
          ))}
          <div className="w-5 h-full" style={{ background: "rgb(239, 246, 255)" }} />
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((r) => (
            <div key={`pos-${r}`} className="w-5 h-full" style={{ background: corrColor(r) }} />
          ))}
        </div>
        <span>1.0</span>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-auto max-w-full">
        <div className="inline-block">
          {/* Column headers */}
          <div className="flex" style={{ marginLeft: cellSize + 4 }}>
            {displayLabels.map((label, i) => (
              <div
                key={i}
                className="flex items-end justify-center pb-1"
                style={{ width: cellSize }}
              >
                <span
                  className="text-[8px] text-muted-foreground rotate-45 origin-bottom-left whitespace-nowrap"
                  style={{ transform: "rotate(-60deg)", transformOrigin: "bottom left" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {displayMatrix.map((row, i) => (
            <div key={i} className="flex items-center" style={{ height: cellSize }}>
              {/* Row label */}
              <div
                className="flex items-center justify-end pr-1.5 shrink-0"
                style={{ width: cellSize }}
              >
                <span className="text-[8px] text-muted-foreground truncate max-w-full text-right">
                  {displayLabels[i]}
                </span>
              </div>

              {/* Cells */}
              {row.map((r, j) => (
                <div
                  key={j}
                  className="flex items-center justify-center shrink-0 border border-white/30"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: i === j ? "#E5E7EB" : corrColor(r),
                  }}
                  title={`${columnLabels[i]} × ${columnLabels[j]}: ${r.toFixed(3)}`}
                >
                  {showValues && (
                    <span
                      className="text-[8px] font-medium"
                      style={{ color: i === j ? "#9CA3AF" : textColorForBg(r) }}
                    >
                      {i === j ? "1" : r.toFixed(2).replace("0.", ".").replace("-0.", "-.")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {correlationMatrix.length > maxItems && (
        <p className="text-[10px] text-muted-foreground">
          仅显示前 {maxItems} 个变量（共 {correlationMatrix.length} 个）
        </p>
      )}
    </div>
  );
}
