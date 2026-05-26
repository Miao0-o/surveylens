"use client";

import { useAppStore } from "@/lib/store";
import { ChartWrapper } from "./chart-wrapper";

interface DescriptiveRow {
  n: number;
  mean: number | null;
  sd: number | null;
  min: number | null;
  max: number | null;
  skew: number | null;
  kurtosis: number | null;
  shapiroP?: number | null;
}

interface Props {
  data: DescriptiveRow[];
  labels: string[];
}

function normalityLabel(p: number | null | undefined, en: boolean): string {
  if (p == null) return "-";
  if (p >= 0.05) return en ? "Normal" : "正态";
  if (p >= 0.01) return en ? "Non-normal*" : "非正态*";
  return en ? "Non-normal**" : "非正态**";
}

function skewLabel(s: number | null, en: boolean): string {
  if (s === null) return "-";
  if (Math.abs(s) < 0.5) return en ? "Symmetrical" : "对称";
  if (Math.abs(s) < 1) return en ? "Mild skew" : "轻度偏态";
  return en ? "Skewed" : "偏态";
}

export function DescriptiveCard({ data, labels }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-medium text-foreground mb-1">
          {en ? "Descriptive Statistics & Normality" : "描述性统计与正态性检验"}
        </h3>
        <p className="text-[10px] text-muted-foreground">
          {en ? "Shapiro-Wilk normality test | Skewness | Kurtosis" : "Shapiro-Wilk 正态性检验 | 偏度 (Skewness) | 峰度 (Kurtosis)"}
        </p>
      </div>

      <ChartWrapper title={en ? "Descriptive Statistics" : "描述性统计表"}>
      <div className="overflow-x-auto rounded-lg border border-border max-h-[400px] overflow-y-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-secondary/50 sticky top-0">
              <th className="text-left px-2.5 py-1.5 text-muted-foreground font-medium border-r border-border">{en ? "Variable" : "变量"}</th>
              <th className="text-right px-2.5 py-1.5 text-muted-foreground font-medium border-r border-border">N</th>
              <th className="text-right px-2.5 py-1.5 text-muted-foreground font-medium border-r border-border">M</th>
              <th className="text-right px-2.5 py-1.5 text-muted-foreground font-medium border-r border-border">SD</th>
              <th className="text-right px-2.5 py-1.5 text-muted-foreground font-medium border-r border-border">Min</th>
              <th className="text-right px-2.5 py-1.5 text-muted-foreground font-medium border-r border-border">Max</th>
              <th className="text-right px-2.5 py-1.5 text-muted-foreground font-medium border-r border-border">{en ? "Skew" : "偏度"}</th>
              <th className="text-right px-2.5 py-1.5 text-muted-foreground font-medium border-r border-border">{en ? "Kurt" : "峰度"}</th>
              <th className="text-center px-2.5 py-1.5 text-muted-foreground font-medium">{en ? "Normality" : "正态性"}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t border-border hover:bg-secondary/20">
                <td className="px-2.5 py-1.5 text-foreground border-r border-border truncate max-w-[120px]">
                  {labels[i] ?? `V${i + 1}`}
                </td>
                <td className="text-right px-2.5 py-1.5 text-foreground border-r border-border">{row.n}</td>
                <td className="text-right px-2.5 py-1.5 text-foreground border-r border-border">{row.mean?.toFixed(2) ?? "-"}</td>
                <td className="text-right px-2.5 py-1.5 text-foreground border-r border-border">{row.sd?.toFixed(2) ?? "-"}</td>
                <td className="text-right px-2.5 py-1.5 text-muted-foreground border-r border-border">{row.min?.toFixed(2) ?? "-"}</td>
                <td className="text-right px-2.5 py-1.5 text-muted-foreground border-r border-border">{row.max?.toFixed(2) ?? "-"}</td>
                <td className={`text-right px-2.5 py-1.5 border-r border-border ${row.skew !== null && Math.abs(row.skew) > 1 ? "text-amber-600" : "text-foreground"}`}>
                  {row.skew?.toFixed(2) ?? "-"} <span className="text-[8px] text-muted-foreground">{skewLabel(row.skew, en)}</span>
                </td>
                <td className={`text-right px-2.5 py-1.5 border-r border-border ${row.kurtosis !== null && Math.abs(row.kurtosis) > 3 ? "text-amber-600" : "text-foreground"}`}>
                  {row.kurtosis?.toFixed(2) ?? "-"}
                </td>
                <td className={`text-center px-2.5 py-1.5 font-medium ${
                  row.shapiroP == null ? "text-muted-foreground" :
                  row.shapiroP! >= 0.05 ? "text-emerald-600" : "text-amber-600"
                }`}>
                  {normalityLabel(row.shapiroP, en)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </ChartWrapper>

      <p className="text-[9px] text-muted-foreground/70">
        * p &lt; 0.05 &nbsp; ** p &lt; 0.01 &nbsp; 偏度 |s| &lt; 0.5 对称 · ≥ 1 偏态 &nbsp; 峰度 &gt; 3 尖峰 · &lt; 3 平峰
      </p>
    </div>
  );
}
