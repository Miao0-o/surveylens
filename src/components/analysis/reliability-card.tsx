"use client";

import type { ReliabilityResult } from "@/types";
import { useAppStore } from "@/lib/store";
import { InfoTip } from "./stat-tooltip";
import { APASnippetBar } from "./apa-snippet-bar";
import { ChartWrapper } from "./chart-wrapper";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Props { data: ReliabilityResult; snippet?: string; }

function alphaLabel(a: number, en: boolean): string {
  if (en) return a >= 0.9 ? "Excellent" : a >= 0.8 ? "Good" : a >= 0.7 ? "Acceptable" : a >= 0.6 ? "Low" : "Unacceptable";
  return a >= 0.9 ? "优秀" : a >= 0.8 ? "良好" : a >= 0.7 ? "可接受" : a >= 0.6 ? "偏低" : "不可接受";
}

function alphaColor(a: number): string {
  return a >= 0.9 ? "text-emerald-600" : a >= 0.8 ? "text-emerald-500" : a >= 0.7 ? "text-amber-500" : a >= 0.6 ? "text-orange-500" : "text-red-500";
}

export function ReliabilityCard({ data, snippet }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const interp = alphaLabel(data.cronbachsAlpha, en);

  const alphaIfDeleted = Object.entries(data.alphaIfItemDeleted)
    .filter(([, v]) => v !== null)
    .map(([item, alpha]) => ({
      item: item.length > 20 ? item.slice(0, 20) + "..." : item,
      alpha: Math.round((alpha as number) * 1000) / 1000,
      fullName: item,
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold text-foreground tracking-tight">{data.cronbachsAlpha.toFixed(3)}</span>
        <div>
          <p className="text-xs font-medium text-foreground flex items-center gap-1">
            Cronbach&apos;s α
            <InfoTip text={en ? "≥ .90 Excellent · ≥ .80 Good · ≥ .70 Acceptable · ≥ .60 Low · < .60 Unacceptable. > .95 may indicate item redundancy." : "≥ 0.90 优秀 · ≥ 0.80 良好 · ≥ 0.70 可接受 · ≥ 0.60 偏低 · < 0.60 不可接受。> 0.95 需警惕题项冗余。"} />
          </p>
          <p className={`text-xs ${alphaColor(data.cronbachsAlpha)}`}>{interp}</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              {en ? "Standardized α" : "标准化 α"}
              <InfoTip text={en ? "Based on standardized items; matching raw α suggests uniform item variance." : "基于标准化题项的 α。与原始 α 一致说明题项方差均匀。"} />
            </p>
            <p className="text-xs text-foreground font-medium">{data.standardizedAlpha.toFixed(3)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              McDonald&apos;s ω
              <InfoTip text={en ? "Factor-loading-based reliability. ≥ .80 good. Less affected by item count than α." : "基于因子载荷的信度估计。≥ 0.80 良好。比 α 更少受题项数影响，假设更宽松。"} />
            </p>
            <p className="text-xs text-foreground font-medium">{data.mcdonaldsOmega?.toFixed(3) ?? "-"}</p>
          </div>
        </div>
      </div>

      {/* Per-dimension subscale alpha */}
      {data.dimensions && data.dimensions.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {data.dimensions.map((dim) => (
            <div key={dim.name} className="px-3 py-2 rounded-lg bg-secondary/20 border border-border/50">
              <p className="text-[10px] text-muted-foreground truncate">{dim.name}</p>
              <p className="text-sm font-semibold text-foreground">
                α = {dim.cronbachsAlpha.toFixed(3)}
                <span className={`text-[10px] ml-1 ${dim.cronbachsAlpha >= 0.8 ? "text-emerald-500" : dim.cronbachsAlpha >= 0.7 ? "text-amber-500" : "text-red-400"}`}>
                  ({dim.cronbachsAlpha >= 0.9 ? (en ? "Excellent" : "优秀") : dim.cronbachsAlpha >= 0.8 ? (en ? "Good" : "良好") : dim.cronbachsAlpha >= 0.7 ? (en ? "Acceptable" : "可接受") : (en ? "Low" : "偏低")})
                </span>
              </p>
              <p className="text-[9px] text-muted-foreground/60">{dim.items.length} {en ? "items" : "题"}</p>
            </div>
          ))}
        </div>
      )}

      {alphaIfDeleted.length > 0 && (
        <ChartWrapper title={en ? "α if Item Deleted" : "删除题目后 α 变化"}>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alphaIfDeleted} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="item" tick={{ fontSize: 10, fill: "#1F2937" }} tickLine={false} axisLine={false} width={120} />
                <Tooltip
                  formatter={(val) => [Number(val).toFixed(3), en ? "α if deleted" : "删除后 α"]}
                  labelFormatter={(label) => alphaIfDeleted.find((d) => d.item === label)?.fullName ?? label as string}
                />
                <Bar dataKey="alpha" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>
      )}

      {snippet && <APASnippetBar text={snippet} />}
    </div>
  );
}
