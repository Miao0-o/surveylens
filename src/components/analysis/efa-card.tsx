"use client";

import type { EFAResult } from "@/types";
import { useAppStore } from "@/lib/store";
import { InfoTip } from "./stat-tooltip";
import { ChartWrapper } from "./chart-wrapper";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface Props {
  data: EFAResult;
}

export function EFACard({ data }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";

  // Scree plot data
  const screeData = data.eigenvalues.map((val, i) => ({
    factor: i + 1,
    eigenvalue: Math.round(val * 1000) / 1000,
  }));

  // Loading matrix (top items only)
  const itemLabels = data.itemLabels;

  return (
    <div className="space-y-4">
      {/* Two-line factor display: statistical result + model decision */}
      {data.metadata && (
        <div className="space-y-2 w-full">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-[11px] text-emerald-700">
              {en ? "Kaiser criterion suggested " : "Kaiser 准则建议 "}
              <span className="font-semibold">{data.metadata.raw_factor_estimation.kaiser_n}</span>
              {en ? " factors" : " 个因子"}
              {data.metadata.raw_factor_estimation.scree_suggestion && (
                <span className="text-emerald-600/70">
                  {en ? ` · Scree elbow: ${data.metadata.raw_factor_estimation.scree_suggestion}` : ` · 碎石拐点: ${data.metadata.raw_factor_estimation.scree_suggestion}`}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/50 border border-amber-100">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-700">
              {en ? "Showing " : "为可解释性呈现 "}
              <span className="font-semibold">{data.suggestedFactors}</span>
              {en ? " factors for interpretability" : " 个因子"}
              {data.metadata.factor_stability.risk_level === "high" && (
                <span className="text-amber-600/70">
                  {" · "}{en ? "Potential over-extraction risk detected" : "检测到潜在过度提取风险"}
                </span>
              )}
              {data.metadata.factor_stability.risk_level === "moderate" && (
                <span className="text-amber-600/70">
                  {" · "}{en ? "Structural instability detected" : "检测到结构不稳定性"}
                </span>
              )}
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <InfoTip text={en ? "Kaiser criterion retains eigenvalues > 1. Scree elbow is the point of maximum eigenvalue drop. To ensure interpretable results, the system shows at most min(kaiser or scree, items/3, 8) factors — this is a presentation decision, not a statistical conclusion." : "Kaiser准则保留特征值 > 1 的因子。碎石拐点为特征值最大降幅点。为确保结果可解释性，系统最多呈现 min(kaiser或碎石拐点, 题项数/3, 8) 个因子——这是展示决策，不是统计结论。"} />
        <div className="text-[11px] text-muted-foreground">
          {en ? "Cumulative variance: " : "累计解释方差: "}
          {data.varianceExplained.length > 0
            ? (data.varianceExplained.reduce((a, b) => a + b, 0) * 100).toFixed(1)
            : "0"}
          %
        </div>
        <span className="text-[10px] text-muted-foreground/60 ml-auto">
          {data.rotation === "varimax" ? "Varimax 旋转" : "Oblimin 旋转"}
        </span>
      </div>

      {/* Scree plot */}
      <ChartWrapper title={en ? "Scree Plot" : "碎石图"}>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={screeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="factor"
                tick={{ fontSize: 10, fill: "#6B7280" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6B7280" }}
                tickLine={false}
                axisLine={false}
              />
              <ReferenceLine y={1} stroke="#D1D5DB" strokeDasharray="4 4" />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                }}
              />
              <Line
                type="monotone"
                dataKey="eigenvalue"
                stroke="#1F2937"
                strokeWidth={1.5}
                dot={{ r: 3, fill: "#1F2937", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#1F2937" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartWrapper>

      {/* Factor loadings matrix */}
      {data.loadings.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-foreground mb-1.5 flex items-center gap-1">
            {en ? "Factor Loadings" : "因子载荷矩阵"}
            <InfoTip text={en ? "Loadings ≥ .40 indicate strong factor membership. .30−.40 is marginal. Cross-loading difference < .20 suggests ambiguous factor assignment." : "载荷 ≥ 0.40 视为显著归属该因子。0.30−0.40 为边缘。交叉载荷差值 < 0.20 表示因子归属模糊。"} />
          </p>
          <div className="overflow-x-auto rounded-lg border border-border max-h-[300px] overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-secondary/50 sticky top-0">
                  <th className="text-left px-3 py-1.5 text-muted-foreground font-medium border-r border-border">
                    题项
                  </th>
                  {Array.from({ length: data.suggestedFactors }, (_, i) => (
                    <th
                      key={i}
                      className="text-center px-3 py-1.5 text-muted-foreground font-medium border-r border-border"
                    >
                      F{i + 1}
                    </th>
                  ))}
                  <th className="text-center px-3 py-1.5 text-muted-foreground font-medium">
                    共同度
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.loadings.slice(0, 30).map((row, i) => (
                  <tr key={i} className="border-t border-border hover:bg-secondary/20">
                    <td className="px-3 py-1.5 text-foreground border-r border-border whitespace-nowrap max-w-[140px] truncate">
                      {itemLabels[i] ?? `Q${i + 1}`}
                    </td>
                    {row.slice(0, data.suggestedFactors).map((loading, j) => (
                      <td
                        key={j}
                        className={`text-center px-3 py-1.5 border-r border-border font-medium ${
                          Math.abs(loading) >= 0.4
                            ? "text-foreground"
                            : Math.abs(loading) >= 0.3
                              ? "text-muted-foreground"
                              : "text-muted-foreground/40"
                        }`}
                      >
                        {loading.toFixed(3)}
                      </td>
                    ))}
                    <td className="text-center px-3 py-1.5 text-muted-foreground">
                      {data.communalities[i]?.toFixed(3) ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
