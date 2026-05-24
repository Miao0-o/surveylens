"use client";

import type { EFAResult } from "@/types";
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
  // Scree plot data
  const screeData = data.eigenvalues.map((val, i) => ({
    factor: i + 1,
    eigenvalue: Math.round(val * 1000) / 1000,
  }));

  // Loading matrix (top items only)
  const itemLabels = data.itemLabels;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-semibold text-foreground">
          {data.suggestedFactors} 个因子
        </span>
        <div className="text-[11px] text-muted-foreground">
          累计解释方差:{" "}
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
      <div>
        <p className="text-[11px] font-medium text-foreground mb-1">碎石图</p>
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
      </div>

      {/* Factor loadings matrix */}
      {data.loadings.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-foreground mb-1.5">因子载荷矩阵</p>
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
