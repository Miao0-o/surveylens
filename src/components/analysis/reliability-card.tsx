"use client";

import type { ReliabilityResult } from "@/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Props {
  data: ReliabilityResult;
}

function alphaInterpretation(alpha: number): { label: string; color: string } {
  if (alpha >= 0.9) return { label: "优秀", color: "text-emerald-600" };
  if (alpha >= 0.8) return { label: "良好", color: "text-emerald-500" };
  if (alpha >= 0.7) return { label: "可接受", color: "text-amber-500" };
  if (alpha >= 0.6) return { label: "偏低", color: "text-orange-500" };
  return { label: "不可接受", color: "text-red-500" };
}

export function ReliabilityCard({ data }: Props) {
  const interp = alphaInterpretation(data.cronbachsAlpha);

  const alphaIfDeleted = Object.entries(data.alphaIfItemDeleted)
    .filter(([, v]) => v !== null)
    .map(([item, alpha]) => ({
      item: item.length > 20 ? item.slice(0, 20) + "..." : item,
      alpha: Math.round((alpha as number) * 1000) / 1000,
      fullName: item,
    }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold text-foreground tracking-tight">
          {data.cronbachsAlpha.toFixed(3)}
        </span>
        <div>
          <p className="text-xs font-medium text-foreground">Cronbach&apos;s α</p>
          <p className={`text-xs ${interp.color}`}>{interp.label}</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">标准化 α</p>
            <p className="text-xs text-foreground font-medium">
              {data.standardizedAlpha.toFixed(3)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">McDonald&apos;s ω</p>
            <p className="text-xs text-foreground font-medium">
              {data.mcdonaldsOmega?.toFixed(3) ?? "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Alpha if item deleted */}
      {alphaIfDeleted.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-foreground mb-2">
            删除题目后 α 变化
          </p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={alphaIfDeleted}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="item"
                  tick={{ fontSize: 10, fill: "#1F2937" }}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                  }}
                  formatter={(value) => [Number(value).toFixed(3), "删除后α"]}
                  labelFormatter={(_label, payload) => {
                    const p = payload?.[0] as { payload?: { fullName?: string } } | undefined;
                    return p?.payload?.fullName ?? String(_label);
                  }}
                />
                <Bar
                  dataKey="alpha"
                  fill="#1F2937"
                  radius={[0, 4, 4, 0]}
                  background={{ fill: "#F3F4F6", radius: 4 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Item-total correlations summary */}
      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(data.itemTotalCorrelation)
          .slice(0, 10)
          .map(([item, corr]) => (
            <div
              key={item}
              className="flex items-center justify-between px-2 py-1 rounded bg-secondary/30 text-[11px]"
            >
              <span className="text-foreground truncate max-w-[120px]">{item}</span>
              <span className={`font-medium ${corr < 0.3 ? "text-amber-500" : "text-emerald-600"}`}>
                {corr.toFixed(3)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
