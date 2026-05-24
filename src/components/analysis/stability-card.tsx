"use client";

import type { StabilityResult } from "@/types";
import { InfoTip } from "./stat-tooltip";
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
  data: StabilityResult;
}

const levelConfig = {
  stable: { label: "稳定", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  moderate: { label: "中等", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  unstable: { label: "不稳定", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
};

export function StabilityCard({ data }: Props) {
  const config = levelConfig[data.stabilityLevel];

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <div
          className={`px-3 py-1.5 rounded-lg ${config.bg} ${config.border} border`}
        >
          <span className={`text-sm font-semibold ${config.color}`}>
            {config.label}
          </span>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            推荐样本量:{" "}
            <span className="text-foreground font-semibold">
              {data.recommendedSampleSize}
            </span>
            <InfoTip text="Bootstrap 稳定性拐点对应的样本量。低于此值时 α 估计可能不稳定。经验法则：≥ 100 为可接受，≥ 200 为良好。" />
          </p>
          {data.elbowPoint && (
            <p className="text-[10px] text-muted-foreground/70">
              拐点位置: n = {data.elbowPoint}
            </p>
          )}
        </div>
      </div>

      {/* Stability curve */}
      {data.alphaCurve.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-foreground mb-1">
            样本稳定性曲线
          </p>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.alphaCurve}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="sampleSize"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "样本量",
                    position: "insideBottom",
                    offset: -3,
                    fontSize: 10,
                    fill: "#6B7280",
                  }}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "α",
                    position: "insideLeft",
                    offset: 0,
                    fontSize: 10,
                    fill: "#6B7280",
                  }}
                />
                {data.elbowPoint && (
                  <ReferenceLine
                    x={data.elbowPoint}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />
                )}
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                  }}
                  formatter={(value) => [Number(value).toFixed(3), "α"]}
                  labelFormatter={(label) => `样本量: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="alpha"
                  stroke="#1F2937"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4, fill: "#1F2937" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/70">
        Bootstrap 重抽样 {data.bootstrapSamples} 次。α 曲线趋于平稳时达到样本稳定性拐点。
      </p>
    </div>
  );
}
