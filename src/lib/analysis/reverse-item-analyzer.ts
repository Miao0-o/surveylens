// ============================================================
// Reverse-Item Analysis System
// Distinguishes: detection vs. risk vs. validation
// ============================================================

import type { AnalysisResults } from "@/types";

export interface ReverseItemAnalysis {
  /** Items that MAY be reverse-coded (detection only, no judgment) */
  detected_items: string[];
  /** Items that likely have coding problems */
  possible_uncoded_items: string[];
  /** Per-item risk assessment */
  item_assessments: Record<string, ReverseItemAssessment>;
  /** Overall risk level */
  risk_level: "none" | "low" | "moderate" | "high" | "undetermined";
  /** Statistical evidence backing the assessment */
  evidence: string[];
  /** Actionable recommendations */
  recommendations: string[];
}

export interface ReverseItemAssessment {
  item: string;
  detected: boolean;
  item_total_corr: number;
  alpha_if_deleted: number | null;
  alpha_change: number | null;
  risk: "none" | "low" | "moderate" | "high" | "undetermined";
  verdict: string;
}

export function analyzeReverseItems(results: AnalysisResults): ReverseItemAnalysis {
  const { reliability } = results;
  const alpha = reliability.cronbachsAlpha;
  const detected: string[] = [];
  const uncoded: string[] = [];
  const assessments: Record<string, ReverseItemAssessment> = {};
  const evidence: string[] = [];

  if (alpha <= 0) {
    return {
      detected_items: [],
      possible_uncoded_items: [],
      item_assessments: {},
      risk_level: "undetermined",
      evidence: ["No reliability data available — unable to assess reverse coding."],
      recommendations: ["Run reliability analysis first."],
    };
  }

  for (const [item, corr] of Object.entries(reliability.itemTotalCorrelation)) {
    const aid = reliability.alphaIfItemDeleted[item] ?? null;
    const alphaChange = aid !== null ? aid - alpha : null;

    // Step 1: Detection
    const isDetected = corr < 0.3; // Low or negative correlation = signal
    if (isDetected) detected.push(item);

    // Step 2: Risk classification
    let risk: ReverseItemAssessment["risk"] = "undetermined";
    let verdict = "";

    if (corr < 0) {
      // Strong evidence of coding problem
      risk = "high";
      verdict = "该题项与量表总分呈负相关，很可能存在反向计分问题。";
      uncoded.push(item);
      evidence.push(`${item}: item-total r = ${corr.toFixed(3)} (negative) — strong reverse-coding problem.`);
    } else if (corr < 0.2 && isDetected) {
      risk = "moderate";
      verdict = "该题项与量表总分相关性较弱，建议核实计分方向。";
      evidence.push(`${item}: item-total r = ${corr.toFixed(3)} (weak) — possible coding inconsistency.`);
    } else if (isDetected && alphaChange !== null && alphaChange > 0.05) {
      risk = "moderate";
      verdict = `删除该题项后 α 上升 ${alphaChange.toFixed(3)}，建议检查题项质量。`;
      evidence.push(`${item}: α increases by ${alphaChange.toFixed(3)} if deleted.`);
    } else if (isDetected) {
      risk = "low";
      verdict = "该题项可能为反向计分题，当前表现正常，无需调整。";
      evidence.push(`${item}: possible reverse-coded item, behaving normally (r = ${corr.toFixed(3)}).`);
    } else {
      risk = "none";
      verdict = "该题项表现正常，无反向计分问题。";
    }

    assessments[item] = {
      item,
      detected: isDetected,
      item_total_corr: corr,
      alpha_if_deleted: aid,
      alpha_change: alphaChange,
      risk,
      verdict,
    };
  }

  // Overall risk
  const hasHigh = uncoded.length > 0;
  const hasModerate = Object.values(assessments).some((a) => a.risk === "moderate");
  const riskLevel: ReverseItemAnalysis["risk_level"] =
    hasHigh ? "high" : hasModerate ? "moderate" : detected.length > 0 ? "low" : "none";

  const recommendations: string[] = [];
  if (hasHigh) {
    recommendations.push(`发现 ${uncoded.length} 个题项存在显著反向计分问题，建议核实原始问卷的计分方向。`);
    recommendations.push("确认反向计分后，重新编码并重新运行信度分析。");
  }
  if (detected.length > 0 && !hasHigh) {
    recommendations.push(`检测到 ${detected.length} 个可能为反向计分的题项，当前表现正常。`);
    recommendations.push("如已确认反向计分正确，无需额外操作。");
  }

  return {
    detected_items: detected,
    possible_uncoded_items: uncoded,
    item_assessments: assessments,
    risk_level: riskLevel,
    evidence,
    recommendations,
  };
}
