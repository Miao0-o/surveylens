"use client";

import type { StabilityResult } from "@/types";
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
  data: StabilityResult;
}

const levelLabels: Record<string, { zh: string; en: string }> = {
  stable: { zh: "稳定", en: "Stable" },
  moderate: { zh: "中等", en: "Moderate" },
  unstable: { zh: "不稳定", en: "Unstable" },
};

const levelColors: Record<string, { color: string; bg: string; border: string }> = {
  stable: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  moderate: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  unstable: { color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
};

export function StabilityCard({ data }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const cfg = levelColors[data.stabilityLevel];
  const label = levelLabels[data.stabilityLevel]?.[lang === "en" ? "en" : "zh"] ?? data.stabilityLevel;

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <div
          className={`px-3 py-1.5 rounded-lg ${cfg.bg} ${cfg.border} border`}
        >
          <span className={`text-sm font-semibold ${cfg.color}`}>
            {label}
          </span>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            {en ? "Recommended N: " : "推荐样本量: "}
            <span className="text-foreground font-semibold">
              {data.recommendedSampleSize}
            </span>
            <InfoTip text={en ? "Sample size at the Bootstrap stability elbow. Below this, α estimates may be unstable. Rule of thumb: ≥ 100 acceptable, ≥ 200 good." : "Bootstrap 稳定性拐点对应的样本量。低于此值时 α 估计可能不稳定。经验法则：≥ 100 为可接受，≥ 200 为良好。"} />
          </p>
          {data.elbowPoint && (
            <p className="text-[10px] text-muted-foreground/70">
              {en ? "Elbow point: n = " : "拐点位置: n = "}{data.elbowPoint}
            </p>
          )}
        </div>
      </div>

      {/* Stability curve */}
      {data.alphaCurve.length > 0 && (
        <ChartWrapper title={en ? "Stability Curve" : "样本稳定性曲线"}>
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
        </ChartWrapper>
      )}

      <p className="text-[10px] text-muted-foreground/70">
        Bootstrap 重抽样 {data.bootstrapSamples} 次。α 曲线趋于平稳时达到样本稳定性拐点。
      </p>
    </div>
  );
}
