// ============================================================
// Analysis Module Registry + Intent → Module Routing
// Add modules here — no UI changes needed
// ============================================================

import type { AnalysisModule, AnalysisIntent } from "./types";
import type { AnalysisResults } from "@/types";
import { resolveSelectedVars } from "@/lib/stats/composite";

// ============================================================
// Adaptive Psychometric Workflow — Mode Detection
// ============================================================

export type AnalysisMode = "single" | "multi" | "exploratory";

/** Module IDs that only apply in multi-scale mode */
const MULTI_SCALE_ONLY = new Set(["scale-consistency"]);

/** Detect analysis mode from research design and available scales */
export function detectAnalysisMode(
  researchDesign: { outcomeVariables?: string[]; predictorVariables?: string[] } | null
): AnalysisMode {
  const allVars = [...(researchDesign?.outcomeVariables ?? []), ...(researchDesign?.predictorVariables ?? [])];
  // No user selection → no construct definitions → exploratory
  if (allVars.length === 0) return "exploratory";
  const { composites } = resolveSelectedVars(allVars);
  // 0 composites with raw items selected → exploratory (unknown structure)
  if (composites.length === 0) return "exploratory";
  if (composites.length === 1) return "single";
  return "multi";
}

/** Get modules filtered by analysis mode */
export function getActiveModulesForMode(
  results: AnalysisResults,
  mode: AnalysisMode
): AnalysisModule[] {
  return analysisModules.filter((m) => {
    if (!m.isAvailable(results)) return false;
    if (mode !== "multi" && MULTI_SCALE_ONLY.has(m.id)) return false;
    return true;
  });
}

function alphaLabel(a: number) {
  return a >= 0.90 ? "excellent" : a >= 0.80 ? "good" : a >= 0.70 ? "acceptable" : "low";
}

export const analysisModules: AnalysisModule[] = [
  {
    id: "descriptive",
    label: "描述",
    intents: ["explore", "validate"],
    sourceStep: "descriptive",
    isAvailable: (_r) => true, // Always available — descriptive stats require no prerequisites
    apaInsight: (r, lang) => {
      const a = r.reliability.cronbachsAlpha;
      if (lang === "zh") {
        if (a <= 0) return `共${r.meta.sampleSize}份样本、${r.meta.itemCount}个测量题项。`;
        return `共${r.meta.sampleSize}份样本、${r.meta.itemCount}个题项，平均α＝${a.toFixed(2)}。`;
      }
      if (a <= 0) return `N = ${r.meta.sampleSize}, ${r.meta.itemCount} items analyzed.`;
      return `N = ${r.meta.sampleSize}, ${r.meta.itemCount} items. Mean α = ${a.toFixed(2)}.`;
    },
  },
  {
    id: "reliability",
    label: "信度",
    intents: ["validate"],
    sourceStep: "reliability",
    isAvailable: (r) => r.reliability._meta.status === "ok",
    apaInsight: (r, lang) => {
      const dims = r.reliability.dimensions;
      if (dims && dims.length > 0) {
        const parts = dims.map(d => {
          const a = d.cronbachsAlpha;
          const level = a >= 0.90 ? (lang === "zh" ? "优秀" : "excellent") : a >= 0.80 ? (lang === "zh" ? "良好" : "good") : a >= 0.70 ? (lang === "zh" ? "可接受" : "acceptable") : (lang === "zh" ? "偏低" : "low");
          return lang === "zh" ? `${d.name} (α = ${a.toFixed(2)}，${level})` : `${d.name} (α = ${a.toFixed(2)}, ${level})`;
        });
        return lang === "zh" ? `各量表信度：${parts.join("；")}。` : `Scale reliabilities: ${parts.join("; ")}.`;
      }
      const a = r.reliability.cronbachsAlpha;
      if (a <= 0) return null;
      if (lang === "zh") {
        const level = a >= 0.90 ? "优秀" : a >= 0.80 ? "良好" : a >= 0.70 ? "可接受" : "偏低";
        return `Cronbach's α系数为${a.toFixed(2)}，内部一致性${level}。`;
      }
      return `Cronbach's α indicated ${alphaLabel(a)} internal consistency (α = ${a.toFixed(2)}).`;
    },
  },
  {
    id: "factor-analysis",
    label: "因子分析",
    intents: ["validate", "explore"],
    sourceStep: "validity",
    isAvailable: (r) => r.validity._meta.status === "ok" || r.efa._meta.status === "ok",
    apaInsight: (r, lang) => {
      const v = r.validity;
      const e = r.efa;
      const parts: string[] = [];
      if (v._meta.status === "ok") {
        const kmo = v.kmo.toFixed(2);
        const sigStr = v.bartlettPValue < 0.001 ? (lang === "zh" ? "p＜0.001" : "p < .001") : v.bartlettPValue < 0.05 ? `p = ${v.bartlettPValue.toFixed(3)}` : `p = ${v.bartlettPValue.toFixed(3)} (${lang === "zh" ? "不显著" : "n.s."})`;
        parts.push(lang === "zh" ? `KMO＝${kmo}，Bartlett球形检验${sigStr}` : `KMO = ${kmo}, Bartlett's test ${sigStr}`);
      }
      if (e._meta.status === "ok") {
        const tv = (e.varianceExplained.reduce((a, b) => a + b, 0) * 100).toFixed(1);
        parts.push(lang === "zh" ? `EFA建议${e.suggestedFactors}个因子，累计解释${tv}%方差` : `EFA suggested ${e.suggestedFactors} factor(s), explaining ${tv}% of variance`);
      }
      return parts.length > 0 ? parts.join(lang === "zh" ? "。" : ". ") + "." : null;
    },
  },
  {
    id: "validity",
    label: "效度",
    intents: ["validate", "explore"],
    sourceStep: "correlation",
    isAvailable: (r) => r.validity.correlationMatrix.length > 0,
    apaInsight: (r, lang) => {
      const n = r.validity.correlationMatrix.length;
      if (n === 0) return null;
      return lang === "zh"
        ? `构念间相关矩阵包含${n}个变量。`
        : `Construct correlation matrix includes ${n} variables.`;
    },
  },
  {
    id: "stability",
    label: "稳定性",
    intents: ["validate"],
    sourceStep: "stability",
    isAvailable: (r) => r.stability.stabilityLevel != null,
    apaInsight: (r, lang) => {
      const s = r.stability;
      if (lang === "zh") {
        const sl = s.stabilityLevel === "stable" ? "稳定" : s.stabilityLevel === "moderate" ? "一般" : "不稳定";
        return `Bootstrap（${s.bootstrapSamples}次）显示信度估计${sl}；建议N≥${s.recommendedSampleSize}。`;
      }
      return `Bootstrap (${s.bootstrapSamples}) indicated ${s.stabilityLevel} reliability estimate; recommended N ≥ ${s.recommendedSampleSize}.`;
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
      const insight = m.apaInsight(results, lang);
      if (insight) map[m.id] = insight;
    }
  }
  return map;
}

/** Generate 2-5 sentence APA summary (PDF Mode) */
export function getSummaryAPA(results: AnalysisResults, lang: "zh" | "en" = "en"): string {
  const insights = getOneLineAPA(results, lang);
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

/** Format integer with thousand separators: 3182 → "3,182" */
function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

/** Format p-value per APA 7 Chinese: p < .001, never p = .000 */
function fmtP(p: number): string {
  if (p < 0.001) return "p＜0.001";
  return `p＝${p.toFixed(3)}`;
}

function buildSummaryZH(results: AnalysisResults, _insights: string[], n: number, items: number): string {
  const { reliability, validity, efa, stability } = results;
  const parts: string[] = [];

  // Opening sentence
  parts.push(`本次分析基于${fmtInt(n)}份有效样本、${items}个测量题项开展。`);

  // Reliability
  const a = reliability.cronbachsAlpha;
  if (a > 0) {
    const level = a >= 0.90 ? "表现优秀" : a >= 0.80 ? "表现良好" : a >= 0.70 ? "尚可" : "偏低";
    parts.push(`量表内部一致性${level}，克朗巴哈α系数为${a.toFixed(2)}。`);
  }

  // Validity
  const kmo = validity.kmo;
  if (kmo > 0) {
    const kmoLabel = kmo >= 0.90 ? "极佳" : kmo >= 0.80 ? "良好" : kmo >= 0.70 ? "处于可接受范围" : kmo >= 0.60 ? "勉强达标" : "不足";
    parts.push(`效度检验结果显示，KMO取样适切性量数为${kmo.toFixed(2)}，${kmoLabel}，适合开展因子分析。`);
  }

  // Bartlett
  if (validity.bartlettChiSquare > 0) {
    const pStr = fmtP(validity.bartlettPValue);
    const sig = validity.bartlettPValue < 0.05 ? "具有统计学显著性" : "未达显著水平";
    parts.push(`巴特利特球形度检验结果${sig}（χ²＝${validity.bartlettChiSquare.toFixed(2)}，df＝${validity.bartlettDf}，${pStr}），变量间存在显著相关关系。`);
  }

  // EFA
  if (efa.suggestedFactors > 0) {
    const tv = (efa.varianceExplained.reduce((a, b) => a + b, 0) * 100).toFixed(1);
    const factorWord = (n: number) => n <= 9 ? ["", "一", "两", "三", "四", "五", "六", "七", "八", "九"][n] ?? String(n) : String(n);
    const kaiserN = efa.metadata?.raw_factor_estimation?.kaiser_n ?? efa.suggestedFactors;
    if (kaiserN !== efa.suggestedFactors) {
      parts.push(`Kaiser准则建议${kaiserN}个因子，但为可解释性与模型稳定性，经探索性因子分析共呈现${factorWord(efa.suggestedFactors)}个公因子，累计方差解释率达${tv}%。`);
    } else {
      parts.push(`经探索性因子分析（EFA），共提取${factorWord(efa.suggestedFactors)}个公因子，累计方差解释率达${tv}%。`);
    }
  }

  // Stability
  if (stability.stabilityLevel != null && stability.recommendedSampleSize != null && stability.recommendedSampleSize > 0) {
    const sl = stability.stabilityLevel === "stable" ? "良好" : stability.stabilityLevel === "moderate" ? "一般" : "不够稳定";
    parts.push(`Bootstrap稳健性检验显示信度估计${sl}，研究建议最低有效样本量为${fmtInt(stability.recommendedSampleSize)}份。`);
  }

  return parts.join("");
}

/** Which Python steps should run for a given intent */
export function getStepsForIntent(intent: AnalysisIntent): string[] {
  const modules = getModulesForIntent(intent);
  return [...new Set(modules.map((m) => m.sourceStep))];
}
