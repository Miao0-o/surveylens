// ============================================================
// Analysis Module Registry
// Add new analyses here — no page changes needed
// ============================================================

import type { AnalysisResults, ReliabilityResult, ValidityResult, EFAResult, StabilityResult } from "@/types";
import type { ComponentType } from "react";

// ---- Module Interface ----
export interface AnalysisModule<T = unknown> {
  id: string;
  label: string;
  /** One-line APA summary, called after analysis completes */
  summarize: (results: AnalysisResults) => string | null;
  /** React component to render this analysis card */
  card: ComponentType<{ results: AnalysisResults; snippet?: string }>;
  /** Which sub-result this module reads from */
  sourceKey: keyof AnalysisResults;
}

// ---- Snippet Helpers ----
function alphaLabel(a: number) {
  return a >= 0.90 ? "excellent" : a >= 0.80 ? "good" : a >= 0.70 ? "acceptable" : "low";
}
function kmoLabel(k: number) {
  return k >= 0.90 ? "marvelous" : k >= 0.80 ? "meritorious" : k >= 0.70 ? "middling" : k >= 0.60 ? "mediocre" : "unacceptable";
}
function stabLabel(s: string) {
  return s === "stable" ? "stable" : s === "moderate" ? "moderately stable" : "unstable";
}

// ---- Module Definitions ----
import { ReliabilityCard } from "@/components/analysis/reliability-card";
import { ValidityCard } from "@/components/analysis/validity-card";
import { CorrelationHeatmap } from "@/components/analysis/correlation-heatmap";
import { EFACard } from "@/components/analysis/efa-card";
import { FactorStructure } from "@/components/analysis/factor-structure";
import { StabilityCard } from "@/components/analysis/stability-card";

export const analysisRegistry: AnalysisModule[] = [
  {
    id: "reliability",
    label: "信度",
    sourceKey: "reliability",
    summarize: (r) => {
      const a = r.reliability.cronbachsAlpha;
      if (a <= 0) return null;
      let s = `Cronbach's alpha indicated ${alphaLabel(a)} internal consistency (α = ${a.toFixed(2)}).`;
      if (r.reliability.mcdonaldsOmega > 0) {
        s += ` McDonald's omega = ${r.reliability.mcdonaldsOmega.toFixed(2)}.`;
      }
      return s;
    },
    card: ({ results, snippet }) => <ReliabilityCard data={results.reliability} snippet={snippet} />,
  },
  {
    id: "validity",
    label: "效度",
    sourceKey: "validity",
    summarize: (r) => {
      const v = r.validity;
      if (v.kmo <= 0) return null;
      const sig = v.bartlettPValue < 0.001 ? "p < .001" : v.bartlettPValue < 0.05 ? `p = ${v.bartlettPValue.toFixed(3)}` : `p = ${v.bartlettPValue.toFixed(3)} (n.s.)`;
      return `KMO = ${v.kmo.toFixed(2)} (${kmoLabel(v.kmo)}); Bartlett's test ${sig}.`;
    },
    card: ({ results }) => (
      <div className="space-y-5">
        <div className="p-5 rounded-xl bg-card border border-border">
          <ValidityCard data={results.validity} />
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <CorrelationHeatmap data={results.validity} />
        </div>
      </div>
    ),
  },
  {
    id: "efa",
    label: "因子",
    sourceKey: "efa",
    summarize: (r) => {
      const e = r.efa;
      if (e.suggestedFactors <= 0) return null;
      const tv = (e.varianceExplained.reduce((a, b) => a + b, 0) * 100).toFixed(1);
      return `EFA (${e.rotation}) suggested ${e.suggestedFactors} factor(s), explaining ${tv}% of variance.`;
    },
    card: ({ results }) => (
      <div className="space-y-5">
        <div className="p-5 rounded-xl bg-card border border-border">
          <EFACard data={results.efa} />
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <FactorStructure data={results.efa} />
        </div>
      </div>
    ),
  },
  {
    id: "stability",
    label: "稳定性",
    sourceKey: "stability",
    summarize: (r) => {
      const s = r.stability;
      if (!s.stabilityLevel) return null;
      return `Bootstrap (${s.bootstrapSamples} samples) indicated ${stabLabel(s.stabilityLevel)} solution; recommended N = ${s.recommendedSampleSize}.`;
    },
    card: ({ results }) => (
      <div className="p-5 rounded-xl bg-card border border-border">
        <StabilityCard data={results.stability} />
      </div>
    ),
  },
];
