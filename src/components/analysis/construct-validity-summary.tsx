"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { AlertTriangle, Info } from "lucide-react";

interface Props {
  correlationMatrix: number[][];
  columnLabels: string[];
}

interface Observation {
  category: "strong" | "moderate" | "weak" | "overlap" | "redundancy";
  pair: [string, string];
  r: number;
  text: string;
}

export function ConstructValiditySummary({ correlationMatrix, columnLabels }: Props) {
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";

  const observations = useMemo((): {
    strong: Observation[];
    moderate: Observation[];
    weak: Observation[];
    overlap: Observation[];
    redundancy: Observation[];
    assessment: string;
  } => {
    const strong: Observation[] = [];
    const moderate: Observation[] = [];
    const weak: Observation[] = [];
    const overlap: Observation[] = [];
    const redundancy: Observation[] = [];

    if (correlationMatrix.length < 2) {
      return {
        strong, moderate, weak, overlap, redundancy,
        assessment: en
          ? "Insufficient variables for construct relationship assessment. At least 2 scale-level variables are required."
          : "变量不足，至少需要 2 个量表级变量。",
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

        // Potential redundancy: |r| >= 0.90
        if (absR >= 0.90) {
          redundancy.push({
            category: "redundancy",
            pair: [labelA, labelB],
            r,
            text: en
              ? `${labelA} and ${labelB} are extremely highly correlated (r = ${r.toFixed(2)}) and may represent redundant measurements.`
              : `${labelA} 与 ${labelB} 关联极强 (r = ${r.toFixed(2)})，可能代表冗余测量。`,
          });
        }
        // Potential construct overlap: |r| >= 0.80
        else if (absR >= 0.80) {
          overlap.push({
            category: "overlap",
            pair: [labelA, labelB],
            r,
            text: en
              ? `${labelA} and ${labelB} are highly correlated (r = ${r.toFixed(2)}) and may partially overlap.`
              : `${labelA} 与 ${labelB} 高度相关 (r = ${r.toFixed(2)})，可能存在部分构念重叠。`,
          });
        }
        // Strong relationship: |r| >= 0.50
        else if (absR >= 0.50) {
          strong.push({
            category: "strong",
            pair: [labelA, labelB],
            r,
            text: en
              ? `${labelA} and ${labelB} show a strong ${r > 0 ? "positive" : "negative"} relationship (r = ${r.toFixed(2)}).`
              : `${labelA} 与 ${labelB} 呈较强${r > 0 ? "正" : "负"}相关 (r = ${r.toFixed(2)})。`,
          });
        }
        // Moderate relationship: |r| >= 0.30
        else if (absR >= 0.30) {
          moderate.push({
            category: "moderate",
            pair: [labelA, labelB],
            r,
            text: en
              ? `${labelA} and ${labelB} show a moderate ${r > 0 ? "positive" : "negative"} relationship (r = ${r.toFixed(2)}).`
              : `${labelA} 与 ${labelB} 呈中等${r > 0 ? "正" : "负"}相关 (r = ${r.toFixed(2)})。`,
          });
        }
        // Weak relationship: |r| < 0.30
        else {
          weak.push({
            category: "weak",
            pair: [labelA, labelB],
            r,
            text: en
              ? `${labelA} and ${labelB} show a weak relationship (r = ${r.toFixed(2)}).`
              : `${labelA} 与 ${labelB} 相关性较弱 (r = ${r.toFixed(2)})。`,
          });
        }
      }
    }

    // Sort: by |r| descending within each group
    strong.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    moderate.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    weak.sort((a, b) => Math.abs(b.r) - Math.abs(b.r));
    overlap.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    redundancy.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    // Overall assessment
    const totalPairs = (n * (n - 1)) / 2;
    const concernCount = overlap.length + redundancy.length;

    let assessment = "";
    if (redundancy.length > 0) {
      assessment = en
        ? "Several constructs show extremely high correlations and may represent redundant measurements. Consider consolidating these constructs or examining their conceptual distinction."
        : "若干构念间关联极强，可能存在冗余测量。建议考量构念合并或审视其概念区分。";
    } else if (concernCount >= Math.floor(totalPairs / 3)) {
      assessment = en
        ? "Multiple constructs show high inter-correlations. Some constructs may partially overlap. Review the pairs noted below."
        : "多个构念间存在较高关联。部分构念可能存在重叠。请审阅下方标注的变量对。";
    } else if (strong.length > 0 && weak.length > 0 && concernCount === 0) {
      assessment = en
        ? "The correlation structure appears interpretable overall. Most constructs demonstrate distinguishable relationships."
        : "相关结构整体清晰可解释，多数构念保持可区分的关联模式。";
    } else if (weak.length === totalPairs) {
      assessment = en
        ? "All construct pairs show weak relationships, suggesting these constructs are largely independent."
        : "所有构念对之间均呈现较弱关联，表明这些构念可能较为独立。";
    } else {
      assessment = en
        ? "The relationship pattern appears interpretable. Review individual pairs below for specific observations."
        : "构念间关联模式可解释。具体观察请参考下方详情。";
    }

    return { strong, moderate, weak, overlap, redundancy, assessment };
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
      {/* Strong Relationships */}
      {observations.strong.length > 0 && (
        <div className="rounded-lg bg-emerald-50/30 border border-emerald-100/50 p-3 space-y-1.5">
          <p className="text-xs font-medium text-emerald-700">
            {en ? "Strong Relationships" : "较强关联"}
            <span className="text-[10px] text-emerald-500/70 ml-1">(|r| ≥ .50)</span>
          </p>
          {observations.strong.map((obs, i) => (
            <p key={i} className="text-[11px] text-emerald-600/80 ml-0">{obs.text}</p>
          ))}
        </div>
      )}

      {/* Moderate Relationships */}
      {observations.moderate.length > 0 && (
        <div className="rounded-lg bg-blue-50/30 border border-blue-100/50 p-3 space-y-1.5">
          <p className="text-xs font-medium text-blue-700">
            {en ? "Moderate Relationships" : "中等关联"}
            <span className="text-[10px] text-blue-500/70 ml-1">(.30 ≤ |r| &lt; .50)</span>
          </p>
          {observations.moderate.map((obs, i) => (
            <p key={i} className="text-[11px] text-blue-600/80 ml-0">{obs.text}</p>
          ))}
        </div>
      )}

      {/* Weak Relationships */}
      {observations.weak.length > 0 && (
        <div className="rounded-lg bg-secondary/20 border border-border/40 p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {en ? "Weak Relationships" : "较弱关联"}
            <span className="text-[10px] text-muted-foreground/50 ml-1">(|r| &lt; .30)</span>
          </p>
          {observations.weak.length === (correlationMatrix.length * (correlationMatrix.length - 1)) / 2 ? (
            <p className="text-[11px] text-muted-foreground ml-0">
              {en ? "All construct pairs show weak relationships." : "所有构念对之间均呈现较弱关联。"}
            </p>
          ) : (
            observations.weak.map((obs, i) => (
              <p key={i} className="text-[11px] text-muted-foreground ml-0">{obs.text}</p>
            ))
          )}
        </div>
      )}

      {/* Potential Construct Overlap */}
      {observations.overlap.length > 0 && (
        <div className="rounded-lg bg-amber-50/40 border border-amber-100/50 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
            <span className="text-xs font-medium text-amber-700">
              {en ? "Potential Construct Overlap" : "潜在构念重叠"}
              <span className="text-[10px] text-amber-500/70 ml-1">(|r| ≥ .80)</span>
            </span>
          </div>
          {observations.overlap.map((obs, i) => (
            <p key={i} className="text-[11px] text-amber-600/80 ml-5">{obs.text}</p>
          ))}
        </div>
      )}

      {/* Potential Construct Redundancy */}
      {observations.redundancy.length > 0 && (
        <div className="rounded-lg bg-red-50/40 border border-red-100/50 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" strokeWidth={1.5} />
            <span className="text-xs font-medium text-red-700">
              {en ? "Potential Construct Redundancy" : "潜在构念冗余"}
              <span className="text-[10px] text-red-500/70 ml-1">(|r| ≥ .90)</span>
            </span>
          </div>
          {observations.redundancy.map((obs, i) => (
            <p key={i} className="text-[11px] text-red-600/80 ml-5">{obs.text}</p>
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
