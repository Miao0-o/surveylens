// ============================================================
// Analysis Module Registry + Intent → Module Routing
// Add modules here — no UI changes needed
// ============================================================

import type { AnalysisModule, AnalysisIntent } from "./types";
import type { AnalysisResults } from "@/types";

function alphaLabel(a: number) {
  return a >= 0.90 ? "excellent" : a >= 0.80 ? "good" : a >= 0.70 ? "acceptable" : "low";
}

export const analysisModules: AnalysisModule[] = [
  {
    id: "reliability",
    label: "信度",
    intents: ["validate"],
    sourceStep: "reliability",
    isAvailable: (r) => r.reliability.cronbachsAlpha > 0,
    apaInsight: (r) => {
      const a = r.reliability.cronbachsAlpha;
      if (a <= 0) return null;
      return `Cronbach's α indicated ${alphaLabel(a)} internal consistency (α = ${a.toFixed(2)}).`;
    },
  },
  {
    id: "validity",
    label: "效度",
    intents: ["validate"],
    sourceStep: "validity",
    isAvailable: (r) => r.validity.kmo > 0,
    apaInsight: (r) => {
      const v = r.validity;
      const sig = v.bartlettPValue < 0.001 ? "p < .001" : v.bartlettPValue < 0.05 ? `p = ${v.bartlettPValue.toFixed(3)}` : `p = ${v.bartlettPValue.toFixed(3)} (n.s.)`;
      return `KMO = ${v.kmo.toFixed(2)}; Bartlett's test ${sig}.`;
    },
  },
  {
    id: "efa",
    label: "因子",
    intents: ["validate", "explore"],
    sourceStep: "efa",
    isAvailable: (r) => r.efa.suggestedFactors > 0,
    apaInsight: (r) => {
      const e = r.efa;
      const tv = (e.varianceExplained.reduce((a, b) => a + b, 0) * 100).toFixed(1);
      return `EFA (${e.rotation}) suggested ${e.suggestedFactors} factor(s), explaining ${tv}% of variance.`;
    },
  },
  {
    id: "stability",
    label: "稳定性",
    intents: ["validate"],
    sourceStep: "stability",
    isAvailable: (r) => r.stability.stabilityLevel !== "unstable" || r.stability.recommendedSampleSize > 0,
    apaInsight: (r) => {
      const s = r.stability;
      return `Bootstrap (${s.bootstrapSamples}) indicated ${s.stabilityLevel} solution; recommended N ≥ ${s.recommendedSampleSize}.`;
    },
  },
];

/** Get modules relevant to a specific intent */
export function getModulesForIntent(intent: AnalysisIntent): AnalysisModule[] {
  return analysisModules.filter((m) => m.intents.includes(intent));
}

/** Get active modules for a results object */
export function getActiveModules(results: AnalysisResults): AnalysisModule[] {
  return analysisModules.filter((m) => m.isAvailable(results));
}

/** Get per-module one-line APA insights (Local Mode) */
export function getOneLineAPA(results: AnalysisResults): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of analysisModules) {
    if (m.isAvailable(results)) {
      const insight = m.apaInsight(results);
      if (insight) map[m.id] = insight;
    }
  }
  return map;
}

/** Generate 2-5 sentence APA summary (PDF Mode only) */
export function getSummaryAPA(results: AnalysisResults): string {
  const insights = getOneLineAPA(results);
  const lines = Object.values(insights).filter(Boolean);
  if (lines.length === 0) return "No significant results to report.";

  const sampleN = results.meta.sampleSize;
  const itemN = results.meta.itemCount;
  const prefix = `Analysis was conducted on N = ${sampleN} with ${itemN} items. `;

  const body = lines.join(" ");

  // Cap at ~5 sentences by splitting on period
  const combined = prefix + body;
  const sentences = combined.match(/[^.!?]+[.!?]+/g) ?? [combined];
  return sentences.slice(0, 5).join(" ").trim();
}

/** Which Python steps should run for a given intent */
export function getStepsForIntent(intent: AnalysisIntent): string[] {
  const modules = getModulesForIntent(intent);
  return [...new Set(modules.map((m) => m.sourceStep))];
}
