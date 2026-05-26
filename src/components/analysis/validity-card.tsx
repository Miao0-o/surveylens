"use client";

import type { ValidityResult } from "@/types";
import { useAppStore } from "@/lib/store";
import { CheckCircle2, XCircle } from "lucide-react";
import { InfoTip } from "./stat-tooltip";

interface Props { data: ValidityResult; }

function kmoLabel(kmo: number, en: boolean): string {
  if (en) return kmo >= 0.9 ? "marvelous" : kmo >= 0.8 ? "meritorious" : kmo >= 0.7 ? "middling" : kmo >= 0.6 ? "mediocre" : kmo >= 0.5 ? "miserable" : "unacceptable";
  return kmo >= 0.9 ? "极佳" : kmo >= 0.8 ? "良好" : kmo >= 0.7 ? "中等" : kmo >= 0.6 ? "勉强" : kmo >= 0.5 ? "不足" : "不适合因子分析";
}

function kmoColor(kmo: number): string {
  return kmo >= 0.9 ? "text-emerald-600" : kmo >= 0.8 ? "text-emerald-500" : kmo >= 0.7 ? "text-amber-500" : kmo >= 0.6 ? "text-orange-500" : "text-red-400";
}

export function ValidityCard({ data }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";

  const bartlettSignificant = data.bartlettPValue < 0.05;
  const pStr = bartlettSignificant ? (en ? "p < .001" : "p < .001")
    : (en ? `p = ${data.bartlettPValue.toFixed(3)}` : `p = ${data.bartlettPValue.toFixed(3)}`);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold text-foreground tracking-tight">{data.kmo.toFixed(3)}</span>
        <div>
          <p className="text-xs font-medium text-foreground flex items-center gap-1">
            {en ? "KMO Measure" : "KMO 检验"}
            <InfoTip text={en ? "≥ .90 marvelous · ≥ .80 meritorious · ≥ .70 middling · ≥ .60 mediocre · ≥ .50 miserable · < .50 unacceptable" : "≥ 0.90 极佳 · ≥ 0.80 良好 · ≥ 0.70 中等 · ≥ 0.60 勉强 · ≥ 0.50 不足 · < 0.50 不适合因子分析"} />
          </p>
          <p className={`text-xs ${kmoColor(data.kmo)}`}>
            {en ? `${kmoLabel(data.kmo, true)} sampling adequacy` : `${kmoLabel(data.kmo, false)}的抽样适合度`}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-secondary/30 border border-border/50">
        {bartlettSignificant ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" strokeWidth={1.5} />
        ) : (
          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" strokeWidth={1.5} />
        )}
        <div>
          <p className="text-xs font-medium text-foreground flex items-center gap-1">
            {en ? "Bartlett's Test" : "Bartlett 球形检验"}
            <InfoTip text={en ? "Tests whether correlation matrix is identity. p < .05 indicates suitability for factor analysis." : "检验相关矩阵是否为单位矩阵。p < 0.05 表示适合因子分析。p ≥ 0.05 表示变量间相关性不足。"} />
          </p>
          <p className="text-[11px] text-muted-foreground">
            χ² = {data.bartlettChiSquare.toFixed(2)}, df = {data.bartlettDf}, {pStr}
          </p>
          <p className="text-[10px] mt-0.5 text-muted-foreground/70">
            {bartlettSignificant
              ? (en ? "Correlation matrix is not an identity matrix — suitable for factor analysis." : "相关矩阵非单位矩阵，适合进行因子分析")
              : (en ? "Correlation matrix approximates identity — unsuitable for factor analysis." : "相关矩阵接近单位矩阵，不适合因子分析")}
          </p>
        </div>
      </div>

      {/* KMO per item */}
      {Object.keys(data.kmoPerItem).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-foreground">{en ? "Per-Item KMO" : "各题项 KMO"}</p>
          <div className="grid grid-cols-4 gap-1">
            {Object.entries(data.kmoPerItem).map(([item, v]) => (
              <div key={item} className="flex justify-between px-2 py-1 rounded bg-secondary/20 text-[10px]">
                <span className="text-muted-foreground truncate">{item}</span>
                <span className={`font-medium ml-1 ${kmoColor(v)}`}>{v.toFixed(2)}</span>
              </div>
            )).slice(0, 16)}
          </div>
        </div>
      )}
    </div>
  );
}
