"use client";

import type { ValidityResult } from "@/types";
import { CheckCircle2, XCircle } from "lucide-react";
import { InfoTip } from "./stat-tooltip";

interface Props {
  data: ValidityResult;
}

function kmoInterpretation(kmo: number): { label: string; color: string } {
  if (kmo >= 0.9) return { label: "极佳", color: "text-emerald-600" };
  if (kmo >= 0.8) return { label: "良好", color: "text-emerald-500" };
  if (kmo >= 0.7) return { label: "中等", color: "text-amber-500" };
  if (kmo >= 0.6) return { label: "勉强", color: "text-orange-500" };
  if (kmo >= 0.5) return { label: "不足", color: "text-red-400" };
  return { label: "不适合因子分析", color: "text-red-600" };
}

export function ValidityCard({ data }: Props) {
  const kmoInterp = kmoInterpretation(data.kmo);
  const bartlettSignificant = data.bartlettPValue < 0.05;

  return (
    <div className="space-y-4">
      {/* KMO */}
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold text-foreground tracking-tight">
          {data.kmo.toFixed(3)}
        </span>
        <div>
          <p className="text-xs font-medium text-foreground flex items-center gap-1">
            KMO 检验
            <InfoTip text="≥ 0.90 极佳 · ≥ 0.80 良好 · ≥ 0.70 中等 · ≥ 0.60 勉强 · ≥ 0.50 不足 · < 0.50 不适合因子分析" />
          </p>
          <p className={`text-xs ${kmoInterp.color}`}>{kmoInterp.label}的抽样适合度</p>
        </div>
      </div>

      {/* Bartlett */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-secondary/30 border border-border/50">
        {bartlettSignificant ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" strokeWidth={1.5} />
        ) : (
          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" strokeWidth={1.5} />
        )}
        <div>
          <p className="text-xs font-medium text-foreground flex items-center gap-1">
            Bartlett 球形检验
            <InfoTip text="检验相关矩阵是否为单位矩阵。p < 0.05 表示适合因子分析。p ≥ 0.05 表示变量间相关性不足。" />
          </p>
          <p className="text-[11px] text-muted-foreground">
            χ² = {data.bartlettChiSquare.toFixed(2)}, df = {data.bartlettDf}, p{" "}
            {bartlettSignificant ? "< .001" : `= ${data.bartlettPValue.toFixed(3)}`}
          </p>
          <p className="text-[10px] mt-0.5 text-muted-foreground/70">
            {bartlettSignificant
              ? "相关矩阵非单位矩阵，适合进行因子分析"
              : "相关矩阵接近单位矩阵，不适合因子分析"}
          </p>
        </div>
      </div>

      {/* KMO per item summary */}
      <div>
        <p className="text-[11px] font-medium text-foreground mb-1.5">各题项 KMO</p>
        <div className="grid grid-cols-2 gap-1 max-h-[160px] overflow-y-auto">
          {Object.entries(data.kmoPerItem)
            .slice(0, 20)
            .map(([item, kmo]) => {
              const isLow = kmo < 0.6;
              return (
                <div
                  key={item}
                  className={`flex items-center justify-between px-2 py-1 rounded text-[11px] ${
                    isLow ? "bg-orange-50/50" : "bg-secondary/30"
                  }`}
                >
                  <span className="text-foreground truncate max-w-[100px]">{item}</span>
                  <span className={`font-medium ${isLow ? "text-orange-500" : "text-muted-foreground"}`}>
                    {kmo.toFixed(3)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
