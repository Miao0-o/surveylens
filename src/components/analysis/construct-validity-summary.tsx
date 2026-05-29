"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface Props {
  correlationMatrix: number[][];
  columnLabels: string[];
}

interface Observation {
  type: "convergent" | "discriminant" | "concern";
  pair: [string, string];
  r: number;
  text: string;
}

export function ConstructValiditySummary({ correlationMatrix, columnLabels }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";

  const observations = useMemo((): {
    convergent: Observation[];
    discriminant: Observation[];
    concerns: Observation[];
    assessment: string;
  } => {
    const convergent: Observation[] = [];
    const discriminant: Observation[] = [];
    const concerns: Observation[] = [];

    if (correlationMatrix.length < 2) {
      return {
        convergent, discriminant, concerns,
        assessment: en
          ? "Insufficient variables for construct validity assessment. At least 2 scale-level variables are required."
          : "变量不足，无法评估构念效度。至少需要 2 个量表级变量。",
      };
    }

    const n = correlationMatrix.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const r = correlationMatrix[i][j];
        if (r == null || isNaN(r)) continue;
        const absR = Math.abs(r);
        const labelA = columnLabels[i] ?? `V${i + 1}`;
        const labelB = columnLabels[j] ?? `V${j + 1}`;

        // Very strong / near-perfect → construct overlap concern
        if (absR >= 0.80) {
          const severity = absR >= 0.90 ? "possible redundancy" : "possible construct overlap";
          concerns.push({
            type: "concern",
            pair: [labelA, labelB],
            r,
            text: en
              ? `${labelA} and ${labelB} are highly correlated (r = ${r.toFixed(2)}), suggesting ${severity}.`
              : `${labelA} 与 ${labelB} 高度相关 (r = ${r.toFixed(2)})，可能存在${absR >= 0.90 ? "构念冗余" : "构念重叠"}。`,
          });
        }

        // Strong/moderate positive → convergent validity
        if (r >= 0.30 && r < 0.80) {
          convergent.push({
            type: "convergent",
            pair: [labelA, labelB],
            r,
            text: en
              ? `${labelA} and ${labelB} show a ${absR >= 0.50 ? "strong" : "moderate"} positive correlation (r = ${r.toFixed(2)}), providing evidence for convergent validity.`
              : `${labelA} 与 ${labelB} 呈${absR >= 0.50 ? "较强" : "中等"}正相关 (r = ${r.toFixed(2)})，为聚合效度提供了证据。`,
          });
        }

        // Weak → discriminant validity
        if (absR < 0.30) {
          discriminant.push({
            type: "discriminant",
            pair: [labelA, labelB],
            r,
            text: en
              ? `${labelA} and ${labelB} show a weak correlation (r = ${r.toFixed(2)}), supporting discriminant validity.`
              : `${labelA} 与 ${labelB} 相关性较弱 (r = ${r.toFixed(2)})，支持区分效度。`,
          });
        }
      }
    }

    // Sort: convergent by |r| descending, discriminant by |r| ascending, concerns by |r| descending
    convergent.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    discriminant.sort((a, b) => Math.abs(a.r) - Math.abs(b.r));
    concerns.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    // Overall assessment
    const hasConvergent = convergent.length > 0;
    const hasDiscriminant = discriminant.length > 0;
    const hasConcerns = concerns.length > 0;

    let assessment = "";
    if (hasConcerns && concerns.length >= Math.floor(n * (n - 1) / 4)) {
      assessment = en
        ? "Multiple constructs show high overlap. Consider reviewing construct definitions and scale composition."
        : "多个构念间存在高度重叠。建议审视构念定义与量表构成。";
    } else if (hasConvergent && hasDiscriminant && !hasConcerns) {
      assessment = en
        ? "Construct validity appears adequate. Related constructs correlate as expected, and distinct constructs remain differentiated."
        : "构念效度良好。相关构念适度关联，独立构念保持区分，未发现结构性问题。";
    } else if (hasConvergent && hasConcerns) {
      assessment = en
        ? "Evidence for convergent validity is present, but some constructs show possible overlap. Review the highly correlated pairs noted below."
        : "聚合效度证据存在，但部分构念可能存在重叠。请审阅下方标注的高相关变量对。";
    } else if (!hasConvergent && discriminant.length === n * (n - 1) / 2) {
      assessment = en
        ? "All constructs show weak inter-correlations, supporting discriminant validity. However, the absence of convergent validity evidence may indicate construct independence."
        : "所有构念间相关性均较弱，支持区分效度。但缺乏聚合效度证据可能表明构念完全独立。";
    } else {
      assessment = en
        ? "Construct validity evidence is mixed. Review the observations below for specific guidance."
        : "构念效度证据较为混合。请参考下方具体观察。";
    }

    return { convergent, discriminant, concerns, assessment };
  }, [correlationMatrix, columnLabels, en]);

  if (correlationMatrix.length < 2) {
    return (
      <div className="px-4 py-3 rounded-lg bg-secondary/20 border border-border/50 text-xs text-muted-foreground">
        {observations.assessment}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Convergent Validity */}
      {observations.convergent.length > 0 && (
        <div className="rounded-lg bg-emerald-50/30 border border-emerald-100/50 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
            <span className="text-xs font-medium text-emerald-700">
              {en ? "Convergent Validity" : "聚合效度"}
            </span>
          </div>
          {observations.convergent.map((obs, i) => (
            <p key={i} className="text-[11px] text-emerald-600/80 ml-5">{obs.text}</p>
          ))}
        </div>
      )}

      {/* Discriminant Validity */}
      {observations.discriminant.length > 0 && (
        <div className="rounded-lg bg-blue-50/30 border border-blue-100/50 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} />
            <span className="text-xs font-medium text-blue-700">
              {en ? "Discriminant Validity" : "区分效度"}
            </span>
          </div>
          {observations.discriminant.length > 0 && (
            <p className="text-[11px] text-blue-600/80 ml-5">
              {observations.discriminant.length === (correlationMatrix.length * (correlationMatrix.length - 1)) / 2
                ? (en ? "All construct pairs show weak correlations, supporting discriminant validity." : "所有构念对之间均呈现较弱相关性，支持区分效度。")
                : (en
                  ? `${observations.discriminant.length} construct pair(s) show weak correlations, supporting discriminant validity.`
                  : `${observations.discriminant.length} 对构念间相关性较弱，支持区分效度。`)}
            </p>
          )}
        </div>
      )}

      {/* Potential Concerns */}
      {observations.concerns.length > 0 && (
        <div className="rounded-lg bg-amber-50/40 border border-amber-100/50 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
            <span className="text-xs font-medium text-amber-700">
              {en ? "Potential Concerns" : "需要注意"}
            </span>
          </div>
          {observations.concerns.map((obs, i) => (
            <p key={i} className="text-[11px] text-amber-600/80 ml-5">{obs.text}</p>
          ))}
        </div>
      )}

      {/* Overall Assessment */}
      <div className="rounded-lg bg-secondary/10 border border-border/50 p-3">
        <p className="text-xs font-medium text-foreground mb-1">
          {en ? "Overall Assessment" : "综合评估"}
        </p>
        <p className="text-[11px] text-muted-foreground">{observations.assessment}</p>
      </div>
    </div>
  );
}
