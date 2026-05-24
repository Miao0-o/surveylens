"use client";

import type { EFAResult } from "@/types";
import { useMemo } from "react";

interface Props {
  data: EFAResult;
}

// Assign each item to its dominant factor
function assignFactors(
  loadings: number[][],
  itemLabels: string[]
): { factor: number; item: string; loading: number }[] {
  const assignments: { factor: number; item: string; loading: number }[] = [];
  for (let i = 0; i < loadings.length; i++) {
    const row = loadings[i];
    let maxIdx = 0;
    let maxVal = Math.abs(row[0]);
    for (let j = 1; j < row.length; j++) {
      if (Math.abs(row[j]) > maxVal) {
        maxVal = Math.abs(row[j]);
        maxIdx = j;
      }
    }
    if (maxVal >= 0.3) {
      assignments.push({
        factor: maxIdx + 1,
        item: itemLabels[i] ?? `Item_${i}`,
        loading: Math.round(row[maxIdx] * 1000) / 1000,
      });
    }
  }
  return assignments;
}

// Factor color palette (academic, soft)
const factorColors = [
  "bg-blue-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-violet-400",
  "bg-rose-400",
  "bg-cyan-400",
];

const factorBorderColors = [
  "border-blue-200",
  "border-emerald-200",
  "border-amber-200",
  "border-violet-200",
  "border-rose-200",
  "border-cyan-200",
];

const factorBgColors = [
  "bg-blue-50/40",
  "bg-emerald-50/40",
  "bg-amber-50/40",
  "bg-violet-50/40",
  "bg-rose-50/40",
  "bg-cyan-50/40",
];

const factorTextColors = [
  "text-blue-700",
  "text-emerald-700",
  "text-amber-700",
  "text-violet-700",
  "text-rose-700",
  "text-cyan-700",
];

const factorDotColors = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-500",
];

export function FactorStructure({ data }: Props) {
  const assignments = useMemo(
    () => assignFactors(data.loadings, data.itemLabels),
    [data.loadings, data.itemLabels]
  );

  // Group by factor
  const grouped = useMemo(() => {
    const map = new Map<number, { factor: number; item: string; loading: number }[]>();
    for (const a of assignments) {
      const list = map.get(a.factor) ?? [];
      list.push(a);
      // Sort by loading descending within each factor
      list.sort((x, y) => y.loading - x.loading);
      map.set(a.factor, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [assignments]);

  if (grouped.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium text-foreground mb-1">因子结构图</p>
        <p className="text-[10px] text-muted-foreground">
          按最大载荷归属分组，载荷 ≥ 0.30 显示
        </p>
      </div>

      {/* Factor groups */}
      <div className="grid gap-3">
        {grouped.map(([factorNum, items], groupIdx) => {
          const ci = (groupIdx) % factorColors.length;
          const variancePct = data.varianceExplained[factorNum - 1]
            ? (data.varianceExplained[factorNum - 1] * 100).toFixed(1)
            : "?";

          return (
            <div
              key={factorNum}
              className={`rounded-xl border ${factorBorderColors[ci]} ${factorBgColors[ci]} p-3`}
            >
              {/* Factor header */}
              <div className="flex items-center gap-2 mb-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${factorDotColors[ci]}`} />
                <span className={`text-xs font-semibold ${factorTextColors[ci]}`}>
                  因子 {factorNum}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {items.length} 题 · 解释方差 {variancePct}%
                </span>
              </div>

              {/* Loading bars */}
              <div className="space-y-1.5">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-foreground w-[120px] shrink-0 truncate text-right">
                      {item.item}
                    </span>
                    <div className="flex-1 h-5 rounded bg-white/60 relative overflow-hidden">
                      <div
                        className={`h-full rounded ${factorColors[ci]} transition-all`}
                        style={{ width: `${Math.abs(item.loading) * 100}%` }}
                      />
                      <span
                        className="absolute inset-y-0 left-2 flex items-center text-[9px] font-medium text-white drop-shadow-sm"
                      >
                        {item.loading.toFixed(3)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cross-loading warnings */}
      {data.loadings.length > 0 && data.loadings[0].length > 1 && (
        <CrossLoadingInfo loadings={data.loadings} itemLabels={data.itemLabels} />
      )}
    </div>
  );
}

function CrossLoadingInfo({
  loadings,
  itemLabels,
}: {
  loadings: number[][];
  itemLabels: string[];
}) {
  const crossLoaded = useMemo(() => {
    const items: { item: string; loadings: string }[] = [];
    for (let i = 0; i < loadings.length; i++) {
      const row = loadings[i];
      const sorted = [...row].sort((a, b) => Math.abs(b) - Math.abs(a));
      if (sorted.length >= 2 && Math.abs(sorted[0]) - Math.abs(sorted[1]) < 0.2) {
        items.push({
          item: itemLabels[i] ?? `Item_${i}`,
          loadings: row.map((l) => l.toFixed(3)).join(", "),
        });
      }
    }
    return items;
  }, [loadings, itemLabels]);

  if (crossLoaded.length === 0) return null;

  return (
    <div className="px-3 py-2 rounded-lg bg-amber-50/50 border border-amber-100/50">
      <p className="text-[10px] font-medium text-amber-700 mb-1">
        交叉载荷提示（{crossLoaded.length} 题）
      </p>
      <div className="space-y-0.5">
        {crossLoaded.map((item, i) => (
          <p key={i} className="text-[9px] text-amber-600/80">
            {item.item}: 载荷 [{item.loadings}]
          </p>
        ))}
      </div>
      <p className="text-[9px] text-amber-500/70 mt-1">
        这些题项在多个因子上载荷接近（差 &lt; 0.20），可能存在构念重叠。
      </p>
    </div>
  );
}
