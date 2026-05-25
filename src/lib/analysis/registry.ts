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
    id: "descriptive",
    label: "描述",
    intents: ["explore", "validate"],
    sourceStep: "descriptive",
    isAvailable: (r) => r.meta.sampleSize > 0,
    apaInsight: (r) => {
      const a = r.reliability.cronbachsAlpha;
      if (a <= 0) return `N = ${r.meta.sampleSize}, ${r.meta.itemCount} items analyzed.`;
      return `N = ${r.meta.sampleSize}, ${r.meta.itemCount} items. Mean α = ${a.toFixed(2)}.`;
    },
  },
  {
    id: "correlation",
    label: "相关",
    intents: ["explore", "validate", "relationship"],
    sourceStep: "correlation",
    isAvailable: (r) => r.validity.correlationMatrix.length > 0,
    apaInsight: (r) => {
      const cm = r.validity.correlationMatrix;
      if (cm.length < 2) return null;
      // Find strongest non-diagonal correlation
      let maxR = 0; let maxI = 0; let maxJ = 0;
      for (let i = 0; i < cm.length; i++) {
        for (let j = 0; j < cm[i].length; j++) {
          if (i !== j && Math.abs(cm[i][j]) > Math.abs(maxR)) {
            maxR = cm[i][j]; maxI = i; maxJ = j;
          }
        }
      }
      const labels = r.validity.columnLabels;
      const dir = maxR > 0 ? "positively" : "negatively";
      return `Strongest correlation: ${labels[maxI] ?? `V${maxI+1}`} was ${dir} related to ${labels[maxJ] ?? `V${maxJ+1}`} (r = ${maxR.toFixed(2)}).`;
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
export function getOneLineAPA(results: AnalysisResults, lang: "zh" | "en" = "en"): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of analysisModules) {
    if (m.isAvailable(results)) {
      const insight = m.apaInsight(results);
      if (insight) map[m.id] = insight;
    }
  }
  return map;
}

/** Generate 2-5 sentence APA summary (PDF Mode) */
export function getSummaryAPA(results: AnalysisResults, lang: "zh" | "en" = "en"): string {
  const insights = getOneLineAPA(results);
  const lines = Object.values(insights).filter(Boolean);
  const sampleN = results.meta.sampleSize;
  const itemN = results.meta.itemCount;

  if (lang === "zh") {
    return buildSummaryZH(results, lines, sampleN, itemN);
  }
  return buildSummaryEN(results, lines, sampleN, itemN);
}

function buildSummaryEN(results: AnalysisResults, insights: string[], n: number, items: number): string {
  if (insights.length === 0) return "No significant results to report.";

  const prefix = `Analysis was conducted on N = ${n} with ${items} items.`;
  const body = insights.join(" ");
  const combined = prefix + " " + body;

  // Split by sentence-ending punctuation followed by space+capital letter
  const sentences = combined.split(/(?<=[.!?])\s+(?=[A-Z])/);
  return sentences.slice(0, 5).join(" ").trim();
}

function buildSummaryZH(results: AnalysisResults, insights: string[], n: number, items: number): string {
  if (insights.length === 0) return "未检测到显著结果。";

  const { reliability, validity, efa, stability } = results;
  const parts: string[] = [];
  parts.push(`基于 N = ${n}（${items} 个题项）的分析。`);

  const a = reliability.cronbachsAlpha;
  if (a > 0) {
    const level = a >= 0.90 ? "优秀" : a >= 0.80 ? "良好" : a >= 0.70 ? "可接受" : "偏低";
    parts.push(`量表内部一致性${level}（Cronbach's α = ${a.toFixed(2)}）。`);
  }

  const kmo = validity.kmo;
  if (kmo > 0) {
    const kmoLabel = kmo >= 0.80 ? "良好" : kmo >= 0.60 ? "可接受" : "不足";
    parts.push(`KMO = ${kmo.toFixed(2)}（${kmoLabel}），Bartlett 球形检验${validity.bartlettPValue < 0.05 ? "显著" : "不显著"}。`);
  }

  if (efa.suggestedFactors > 0) {
    const tv = (efa.varianceExplained.reduce((a, b) => a + b, 0) * 100).toFixed(1);
    parts.push(`EFA 提取 ${efa.suggestedFactors} 个因子，累计解释 ${tv}% 方差。`);
  }

  if (stability.stabilityLevel) {
    const sl = stability.stabilityLevel === "stable" ? "稳定" : stability.stabilityLevel === "moderate" ? "中等" : "不稳定";
    parts.push(`Bootstrap 稳定性${sl}，推荐样本量 N ≥ ${stability.recommendedSampleSize}。`);
  }

  return parts.slice(0, 5).join("");
}

/** Which Python steps should run for a given intent */
export function getStepsForIntent(intent: AnalysisIntent): string[] {
  const modules = getModulesForIntent(intent);
  return [...new Set(modules.map((m) => m.sourceStep))];
}
