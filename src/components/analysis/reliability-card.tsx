"use client";

import { useState } from "react";
import type { ReliabilityResult } from "@/types";
import { useAppStore } from "@/lib/store";
import { InfoTip } from "./stat-tooltip";
import { APASnippetBar } from "./apa-snippet-bar";
import { ChartWrapper } from "./chart-wrapper";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";

interface Props { data: ReliabilityResult; snippet?: string; }

function alphaLabel(a: number, en: boolean): string {
  if (en) return a >= 0.9 ? "Excellent" : a >= 0.8 ? "Good" : a >= 0.7 ? "Acceptable" : a >= 0.6 ? "Questionable" : "Poor";
  return a >= 0.9 ? "优秀" : a >= 0.8 ? "良好" : a >= 0.7 ? "可接受" : a >= 0.6 ? "存疑" : "偏低";
}

function alphaColor(a: number): string {
  return a >= 0.9 ? "text-emerald-600" : a >= 0.8 ? "text-emerald-500" : a >= 0.7 ? "text-amber-500" : a >= 0.6 ? "text-orange-500" : "text-red-500";
}

function formatVal(v: number | null | undefined, decimals = 3): string {
  if (v == null) return "—";
  return v.toFixed(decimals);
}

function ScaleCard({ dim, en, globalData }: { dim: NonNullable<ReliabilityResult["dimensions"]>[number]; en: boolean; globalData: ReliabilityResult }) {
  const [expanded, setExpanded] = useState(false);
  const a = dim.cronbachsAlpha;
  const interp = alphaLabel(a, en);

  // Filter item-total and alpha-if-deleted for this scale's items
  const scaleItems = new Set(dim.items);
  const itemTotal = Object.entries(globalData.itemTotalCorrelation)
    .filter(([k]) => scaleItems.has(k))
    .sort(([, a], [, b]) => a - b);

  const alphaIfDel = Object.entries(globalData.alphaIfItemDeleted)
    .filter(([k]) => scaleItems.has(k))
    .filter(([, v]) => v !== null)
    .map(([item, alpha]) => ({
      item: item.length > 20 ? item.slice(0, 20) + "..." : item,
      alpha: Math.round((alpha as number) * 1000) / 1000,
      fullName: item,
    }));

  // Weak items: item-total < 0.3 or alpha-if-deleted substantially higher
  const weakItems = itemTotal
    .filter(([, corr]) => corr < 0.3 && corr >= 0)
    .map(([item]) => item);

  // Reverse items: negative item-total correlation
  const reverseItems = itemTotal
    .filter(([, corr]) => corr < 0)
    .map(([item]) => item);

  return (
    <div className="rounded-lg border border-border/50 bg-secondary/10">
      {/* Scale header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors rounded-lg text-left"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        <span className="text-sm font-medium text-foreground truncate flex-1">{dim.name}</span>
        <span className="text-xs text-muted-foreground">{dim.items.length} {en ? "items" : "题"}</span>
        <span className={`text-sm font-semibold tabular-nums ${alphaColor(a)}`}>α = {a.toFixed(3)}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${a >= 0.8 ? "bg-emerald-50 text-emerald-600" : a >= 0.7 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}>{interp}</span>
      </button>

      {/* Expanded diagnostics */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          {/* Reliability Details */}
          <div className="rounded-lg bg-secondary/10 p-2.5 space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{en ? "Reliability Details" : "信度详情"}</p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Cronbach&apos;s α</span>
                <p className="text-foreground font-semibold">{a.toFixed(3)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{en ? "Standardized α" : "标准化 α"}</span>
                <p className="text-foreground font-semibold">{formatVal(dim.standardizedAlpha)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">McDonald&apos;s ω</span>
                <p className="text-foreground font-semibold">{formatVal(null)}</p>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {(weakItems.length > 0 || reverseItems.length > 0) && (
            <div className="space-y-1">
              {reverseItems.length > 0 && (
                <div className="flex items-start gap-1.5 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{en ? `Possible reverse-coded: ${reverseItems.join(", ")}` : `可能反向计分: ${reverseItems.join(", ")}`}</span>
                </div>
              )}
              {weakItems.length > 0 && (
                <div className="flex items-start gap-1.5 text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-1.5">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{en ? `Low item-total correlation: ${weakItems.join(", ")}` : `题总相关较弱: ${weakItems.join(", ")}`}</span>
                </div>
              )}
            </div>
          )}

          {/* Item-total correlations */}
          {itemTotal.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5">{en ? "Item-Total Correlations" : "题总相关"}</p>
              <div className="flex flex-wrap gap-1.5">
                {itemTotal.map(([item, corr]) => (
                  <span key={item} className={`text-[10px] px-1.5 py-0.5 rounded border ${corr < 0 ? "border-amber-200 bg-amber-50 text-amber-700" : corr < 0.3 ? "border-blue-100 bg-blue-50 text-blue-600" : "border-emerald-100 bg-emerald-50 text-emerald-600"}`}>
                    {item.length > 15 ? item.slice(0, 15) + "…" : item}: {corr.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Alpha if deleted chart */}
          {alphaIfDel.length > 0 && (
            <ChartWrapper title={en ? "α if Item Deleted" : "删除题目后 α 变化"}>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alphaIfDel} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                    <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="item" tick={{ fontSize: 10, fill: "#1F2937" }} tickLine={false} axisLine={false} width={120} />
                    <Tooltip formatter={(val) => [Number(val).toFixed(3), en ? "α if deleted" : "删除后 α"]} labelFormatter={(label) => alphaIfDel.find((d) => d.item === label)?.fullName ?? label as string} />
                    <Bar dataKey="alpha" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartWrapper>
          )}
        </div>
      )}
    </div>
  );
}

export function ReliabilityCard({ data, snippet }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const dims = data.dimensions ?? [];

  // Scale summary
  const scaleCount = dims.length;
  const excellent = dims.filter(d => d.cronbachsAlpha >= 0.9).length;
  const good = dims.filter(d => d.cronbachsAlpha >= 0.8 && d.cronbachsAlpha < 0.9).length;
  const acceptable = dims.filter(d => d.cronbachsAlpha >= 0.7 && d.cronbachsAlpha < 0.8).length;
  const poor = dims.filter(d => d.cronbachsAlpha < 0.7).length;
  const meanAlpha = scaleCount > 0 ? dims.reduce((s, d) => s + d.cronbachsAlpha, 0) / scaleCount : data.cronbachsAlpha;

  // Global item diagnostics (for single-scale mode)
  const alphaIfDeleted = Object.entries(data.alphaIfItemDeleted)
    .filter(([, v]) => v !== null)
    .map(([item, alpha]) => ({
      item: item.length > 20 ? item.slice(0, 20) + "..." : item,
      alpha: Math.round((alpha as number) * 1000) / 1000,
      fullName: item,
    }));

  return (
    <div className="space-y-4">
      {/* === SCALE-LEVEL OVERVIEW === */}
      {scaleCount > 1 && (
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-xs font-medium text-foreground mb-3 flex items-center gap-1">
            {en ? "Reliability Overview" : "信度概览"}
            <InfoTip text={en ? "Reliability computed separately for each scale. Never merge unrelated constructs into one α." : "每个量表独立计算信度。不同构念不会混为一个 α。"} />
          </p>
          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-2xl font-semibold text-foreground">{formatVal(meanAlpha)}</p>
              <p className="text-[10px] text-muted-foreground">{en ? "Mean Scale α" : "平均量表 α"}</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{scaleCount}</p>
              <p className="text-[10px] text-muted-foreground">{en ? "Total Scales" : "共计量表"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            {excellent > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">{excellent} {en ? "Excellent" : "优秀"} (α ≥ .90)</span>}
            {good > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-50/50 text-emerald-600 border border-emerald-100/50">{good} {en ? "Good" : "良好"} (.80–.89)</span>}
            {acceptable > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">{acceptable} {en ? "Acceptable" : "可接受"} (.70–.79)</span>}
            {poor > 0 && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">{poor} {en ? "Poor" : "偏低"} (&lt; .70)</span>}
          </div>
        </div>
      )}

      {/* === SINGLE-SCALE MODE (no dims) === */}
      {scaleCount === 0 && (
        <>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-foreground tracking-tight">{data.cronbachsAlpha.toFixed(3)}</span>
            <div>
              <p className="text-xs font-medium text-foreground flex items-center gap-1">
                Cronbach&apos;s α
                <InfoTip text={en ? "≥ .90 Excellent · ≥ .80 Good · ≥ .70 Acceptable · ≥ .60 Questionable · < .60 Poor. > .95 may indicate item redundancy." : "≥ 0.90 优秀 · ≥ 0.80 良好 · ≥ 0.70 可接受 · ≥ 0.60 存疑 · < 0.60 偏低。> 0.95 需警惕题项冗余。"} />
              </p>
              <p className={`text-xs ${alphaColor(data.cronbachsAlpha)}`}>{alphaLabel(data.cronbachsAlpha, en)}</p>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {en ? "Standardized α" : "标准化 α"}
                  <InfoTip text={en ? "Based on standardized items; matching raw α suggests uniform item variance." : "基于标准化题项的 α。与原始 α 一致说明题项方差均匀。"} />
                </p>
                <p className="text-xs text-foreground font-medium">{formatVal(data.standardizedAlpha)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  McDonald&apos;s ω
                  <InfoTip text={en ? "Factor-loading-based reliability. ≥ .80 good." : "基于因子载荷的信度估计。≥ 0.80 良好。"} />
                </p>
                <p className="text-xs text-foreground font-medium">{formatVal(data.mcdonaldsOmega)}</p>
              </div>
            </div>
          </div>

          {alphaIfDeleted.length > 0 && (
            <ChartWrapper title={en ? "α if Item Deleted" : "删除题目后 α 变化"}>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alphaIfDeleted} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                    <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="item" tick={{ fontSize: 10, fill: "#1F2937" }} tickLine={false} axisLine={false} width={120} />
                    <Tooltip formatter={(val) => [Number(val).toFixed(3), en ? "α if deleted" : "删除后 α"]} labelFormatter={(label) => alphaIfDeleted.find((d) => d.item === label)?.fullName ?? label as string} />
                    <Bar dataKey="alpha" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartWrapper>
          )}
        </>
      )}

      {/* === PER-SCALE CARDS === */}
      {scaleCount > 0 && (
        <div className="space-y-2">
          {dims
            .sort((a, b) => b.cronbachsAlpha - a.cronbachsAlpha)
            .map((dim) => (
              <ScaleCard key={dim.name} dim={dim} en={en} globalData={data} />
            ))}
        </div>
      )}

      {snippet && <APASnippetBar text={snippet} />}
    </div>
  );
}
