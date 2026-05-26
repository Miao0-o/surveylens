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
    id: "descriptive",
    label: "描述",
    intents: ["explore", "validate"],
    sourceStep: "descriptive",
    isAvailable: (r) => r.meta.sampleSize > 0,
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
      const a = r.reliability.cronbachsAlpha;
      if (a <= 0) return null;
      if (lang === "zh") {
        const level = a >= 0.90 ? "优秀" : a >= 0.80 ? "良好" : a >= 0.70 ? "尚可" : "偏低";
        return `Cronbach's α系数为${a.toFixed(2)}，内部一致性${level}。`;
      }
      return `Cronbach's α indicated ${alphaLabel(a)} internal consistency (α = ${a.toFixed(2)}).`;
    },
  },
  {
    id: "validity",
    label: "效度",
    intents: ["validate"],
    sourceStep: "validity",
    isAvailable: (r) => r.validity._meta.status === "ok",
    apaInsight: (r, lang) => {
      const v = r.validity;
      if (lang === "zh") {
        const sig = v.bartlettPValue < 0.001 ? "p＜0.001" : v.bartlettPValue < 0.05 ? `p＝${v.bartlettPValue.toFixed(3)}` : `p＝${v.bartlettPValue.toFixed(3)} (不显著)`;
        return `KMO＝${v.kmo.toFixed(2)}；Bartlett球形检验${sig}。`;
      }
      const sig = v.bartlettPValue < 0.001 ? "p < .001" : v.bartlettPValue < 0.05 ? `p = ${v.bartlettPValue.toFixed(3)}` : `p = ${v.bartlettPValue.toFixed(3)} (n.s.)`;
      return `KMO = ${v.kmo.toFixed(2)}; Bartlett's test ${sig}.`;
    },
  },
  {
    id: "efa",
    label: "因子",
    intents: ["validate", "explore"],
    sourceStep: "efa",
    isAvailable: (r) => r.efa._meta.status === "ok",
    apaInsight: (r, lang) => {
      const e = r.efa;
      const tv = (e.varianceExplained.reduce((a, b) => a + b, 0) * 100).toFixed(1);
      const displayN = e.suggestedFactors;
      const kaiserN = e.metadata?.raw_factor_estimation?.kaiser_n ?? displayN;
      if (lang === "zh") {
        const w = (n: number) => n <= 9 ? ["", "一", "两", "三", "四", "五", "六", "七", "八", "九"][n] ?? String(n) : String(n);
        const base = `探索性因子分析（${e.rotation}）：Kaiser准则建议${kaiserN}个因子，累计解释${tv}%方差。`;
        return kaiserN !== displayN ? `${base}为可解释性显示${w(displayN)}个因子。` : base;
      }
      const base = `EFA (${e.rotation}): Kaiser criterion suggested ${kaiserN} factor(s), explaining ${tv}% of variance.`;
      return kaiserN !== displayN ? `${base} Showing ${displayN} factors for interpretability.` : base;
    },
  },
  {
    id: "correlation",
    label: "相关",
    intents: ["explore", "validate", "relationship"],
    sourceStep: "correlation",
    isAvailable: (r) => r.validity.correlationMatrix.length > 0,
    apaInsight: (r, lang) => {
      const cm = r.validity.correlationMatrix;
      if (cm.length < 2) return null;
      let maxR = 0; let maxI = 0; let maxJ = 0;
      for (let i = 0; i < cm.length; i++) {
        for (let j = 0; j < cm[i].length; j++) {
          if (i !== j && Math.abs(cm[i][j]) > Math.abs(maxR)) {
            maxR = cm[i][j]; maxI = i; maxJ = j;
          }
        }
      }
      const labels = r.validity.columnLabels;
      const li = labels[maxI] ?? `V${maxI+1}`;
      const lj = labels[maxJ] ?? `V${maxJ+1}`;
      if (lang === "zh") {
        const dir = maxR > 0 ? "正相关" : "负相关";
        return `最强相关：${li}与${lj}呈${dir}（r＝${maxR.toFixed(2)}）。`;
      }
      const dir = maxR > 0 ? "positively" : "negatively";
      return `Strongest correlation: ${li} was ${dir} related to ${lj} (r = ${maxR.toFixed(2)}).`;
    },
  },
  {
    id: "stability",
    label: "稳定性",
    intents: ["validate"],
    sourceStep: "stability",
    isAvailable: (r) => r.stability.stabilityLevel !== "unstable" || r.stability.recommendedSampleSize > 0,
    apaInsight: (r, lang) => {
      const s = r.stability;
      if (lang === "zh") {
        const sl = s.stabilityLevel === "stable" ? "稳定" : s.stabilityLevel === "moderate" ? "一般" : "不稳定";
        return `Bootstrap（${s.bootstrapSamples}次）显示因子结构${sl}；建议N≥${s.recommendedSampleSize}。`;
      }
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
  if (stability.stabilityLevel && stability.recommendedSampleSize > 0) {
    const sl = stability.stabilityLevel === "stable" ? "良好" : stability.stabilityLevel === "moderate" ? "一般" : "不够稳定";
    parts.push(`Bootstrap稳健性检验显示因子结构稳定性${sl}，研究建议最低有效样本量为${fmtInt(stability.recommendedSampleSize)}份。`);
  }

  return parts.join("");
}

/** Which Python steps should run for a given intent */
export function getStepsForIntent(intent: AnalysisIntent): string[] {
  const modules = getModulesForIntent(intent);
  return [...new Set(modules.map((m) => m.sourceStep))];
}
