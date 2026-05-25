// ============================================================
// Validation Engine (Layer 2 — Safety Gate #1)
// Rule-based sanity checks + confidence scoring
// Runs AFTER stats, BEFORE AI compression
// ============================================================

import type { AnalysisResults } from "@/types";

// ---- Validation Report ----

export interface ValidationFlag {
  type: "error" | "warning" | "info";
  source: "reliability" | "validity" | "efa" | "stability";
  code: string;
  message: string;
}

export interface ConfidenceScore {
  dataQuality: number;       // based on missing rate, sample size
  reliability: number;       // based on alpha + item-total consistency
  validity: number;          // based on KMO + Bartlett
  factorStability: number;   // based on bootstrap results
  overall: number;           // weighted average
  level: "HIGH" | "MEDIUM" | "LOW" | "UNRELIABLE";
}

export interface ValidationReport {
  flags: ValidationFlag[];
  confidence: ConfidenceScore;
  passed: boolean;         // no errors = true
  timestamp: number;
  version: string;
}

// ---- Rule Engine ----

export function validateResults(results: AnalysisResults): ValidationReport {
  const flags: ValidationFlag[] = [];
  const { reliability, validity, efa, stability, meta } = results;

  // ── Reliability Rules ──
  const alpha = reliability.cronbachsAlpha;

  if (alpha > 0.98) {
    flags.push({
      type: "warning",
      source: "reliability",
      code: "RELIABILITY_REDUNDANT",
      message: `Cronbach's α = ${alpha.toFixed(3)} — 极高，题项可能存在冗余，建议检查重复内容。`,
    });
  }

  if (alpha < 0.60) {
    flags.push({
      type: "error",
      source: "reliability",
      code: "RELIABILITY_LOW",
      message: `Cronbach's α = ${alpha.toFixed(3)} — 低于可接受阈值 (0.60)，量表缺乏内部一致性。`,
    });
  } else if (alpha < 0.70) {
    flags.push({
      type: "warning",
      source: "reliability",
      code: "RELIABILITY_MARGINAL",
      message: `Cronbach's α = ${alpha.toFixed(3)} — 偏低，建议修订量表。`,
    });
  }

  // Check for items that significantly improve alpha if deleted
  for (const [item, alphaIfDel] of Object.entries(reliability.alphaIfItemDeleted)) {
    if (alphaIfDel !== null && alphaIfDel - alpha > 0.05) {
      flags.push({
        type: "info",
        source: "reliability",
        code: "ALPHA_IMPROVE_IF_DELETED",
        message: `删除 "${item}" 可能将 α 从 ${alpha.toFixed(3)} to ${alphaIfDel.toFixed(3)}.`,
      });
    }
  }

  // Check item-total correlations
  for (const [item, corr] of Object.entries(reliability.itemTotalCorrelation)) {
    if (corr < 0.2) {
      flags.push({
        type: "warning",
        source: "reliability",
        code: "LOW_ITEM_TOTAL",
        message: `"${item}" 题总相关偏低 (r = ${corr.toFixed(3)}). 建议检查。`,
      });
    }
    if (corr < 0) {
      flags.push({
        type: "error",
        source: "reliability",
        code: "NEGATIVE_ITEM_TOTAL",
        message: `"${item}" 题总相关为负值 — 可能存在反向计分问题。`,
      });
    }
  }

  // ── Validity Rules ──
  const kmo = validity.kmo;

  if (kmo < 0.50) {
    flags.push({
      type: "error",
      source: "validity",
      code: "KMO_UNACCEPTABLE",
      message: `KMO = ${kmo.toFixed(3)} — 因子分析不适用于当前数据。`,
    });
  } else if (kmo < 0.60) {
    flags.push({
      type: "warning",
      source: "validity",
      code: "KMO_LOW",
      message: `KMO = ${kmo.toFixed(3)} — 取样适切性偏低。`,
    });
  }

  for (const [item, itemKmo] of Object.entries(validity.kmoPerItem)) {
    if (itemKmo < 0.50) {
      flags.push({
        type: "warning",
        source: "validity",
        code: "ITEM_KMO_LOW",
        message: `"${item}" KMO 值偏低 (${itemKmo.toFixed(3)}) — 建议从因子分析中移除。`,
      });
    }
  }

  if (validity.bartlettPValue >= 0.05) {
    flags.push({
      type: "error",
      source: "validity",
      code: "BARTLETT_NOT_SIGNIFICANT",
      message: `Bartlett's test not significant (p = ${validity.bartlettPValue.toFixed(3)}) — 相关矩阵可能为单位矩阵。`,
    });
  }

  // ── EFA Rules ──
  if (efa.loadings.length > 0 && efa.loadings[0].length > 1) {
    for (let i = 0; i < efa.loadings.length; i++) {
      const row = efa.loadings[i];
      const sorted = [...row].sort((a, b) => Math.abs(b) - Math.abs(a));
      if (sorted.length >= 2 && Math.abs(sorted[0]) - Math.abs(sorted[1]) < 0.20) {
        const label = efa.itemLabels[i] ?? `Item_${i}`;
        flags.push({
          type: "warning",
          source: "efa",
          code: "CROSS_LOADING",
          message: `"${label}" 存在交叉载荷 (max diff < 0.20) — 因子归属模糊。`,
        });
      }
    }
  }

  // Check variance explained
  const totalVar = efa.varianceExplained.reduce((a, b) => a + b, 0);
  if (totalVar < 0.40) {
    flags.push({
      type: "warning",
      source: "efa",
      code: "LOW_VARIANCE_EXPLAINED",
      message: `Total variance explained = ${(totalVar * 100).toFixed(1)}% — below 40%. 因子结构可能较弱。`,
    });
  }

  // Check eigenvalue structure
  if (efa.suggestedFactors === 1 && efa.eigenvalues.length > 1) {
    const ratio = efa.eigenvalues[0] / efa.eigenvalues[1];
    if (ratio > 5) {
      flags.push({
        type: "info",
        source: "efa",
        code: "DOMINANT_FIRST_FACTOR",
        message: `First eigenvalue dominates (ratio = ${ratio.toFixed(1)}:1) — 可能存在单维性或方法效应。`,
      });
    }
  }

  // ── Stability Rules ──
  if (stability.stabilityLevel === "unstable") {
    flags.push({
      type: "warning",
      source: "stability",
      code: "UNSTABLE_SOLUTION",
      message: "Bootstrap stability indicates an unstable factor solution. 建议增大样本量。",
    });
  }

  if (meta.sampleSize < stability.recommendedSampleSize) {
    flags.push({
      type: "info",
      source: "stability",
      code: "SAMPLE_SIZE_BELOW_RECOMMENDED",
      message: `Current N = ${meta.sampleSize} < recommended N = ${stability.recommendedSampleSize}. 结果可能不稳定。`,
    });
  }

  if (meta.sampleSize < 30) {
    flags.push({
      type: "error",
      source: "stability",
      code: "SAMPLE_TOO_SMALL",
      message: `N = ${meta.sampleSize} — 样本量过小，无法进行可靠的因子分析，建议至少 100 份。`,
    });
  } else if (meta.sampleSize < 100) {
    flags.push({
      type: "warning",
      source: "stability",
      code: "SAMPLE_SMALL",
      message: `N = ${meta.sampleSize} — 样本量偏小，结果解读需谨慎。`,
    });
  }

  // ── Confidence Scoring ──
  const confidence = computeConfidence(results, flags);

  return {
    flags,
    confidence,
    passed: !flags.some((f) => f.type === "error"),
    timestamp: Date.now(),
    version: "1.0.0",
  };
}

// ---- Confidence Score Calculator ----

function computeConfidence(results: AnalysisResults, flags: ValidationFlag[]): ConfidenceScore {
  const { reliability, validity, efa, stability, meta } = results;

  // Data quality (missing rate, sample size)
  const nScore = Math.min(1, meta.sampleSize / 200);           // 0-1, 200+ = full
  const itemRatio = Math.min(1, meta.itemCount / 10);           // 0-1, 10+ items = full
  const dataQuality = clamp((nScore * 0.6 + itemRatio * 0.4), 0, 1);

  // Reliability score
  let relScore = 0;
  const alpha = reliability.cronbachsAlpha;
  if (alpha >= 0.90) relScore = 0.95;
  else if (alpha >= 0.80) relScore = 0.85;
  else if (alpha >= 0.70) relScore = 0.70;
  else if (alpha >= 0.60) relScore = 0.50;
  else relScore = 0.25;

  // Penalty for negative item-total correlations (capped)
  const negItems = Object.values(reliability.itemTotalCorrelation).filter((v) => v < 0).length;
  relScore = Math.max(0, relScore - Math.min(negItems, 5) * 0.05);
  const reliabilityScore = clamp(relScore, 0, 1);

  // Validity score
  let valScore = 0;
  const kmo = validity.kmo;
  if (kmo >= 0.90) valScore = 0.95;
  else if (kmo >= 0.80) valScore = 0.85;
  else if (kmo >= 0.70) valScore = 0.65;
  else if (kmo >= 0.60) valScore = 0.45;
  else if (kmo >= 0.50) valScore = 0.30;
  else valScore = 0.10;

  // Bartlett penalty
  if (validity.bartlettPValue >= 0.05) valScore -= 0.3;
  const validityScore = clamp(valScore, 0, 1);

  // Factor stability score
  let stabScore = 0;
  switch (stability.stabilityLevel) {
    case "stable": stabScore = 0.90; break;
    case "moderate": stabScore = 0.60; break;
    case "unstable": stabScore = 0.30; break;
  }
  const totalVar = efa.varianceExplained.reduce((a, b) => a + b, 0);
  if (totalVar < 0.40) stabScore -= 0.15;
  // Only count stability/EFA-related errors
  const stabErrors = flags.filter((f) => f.type === "error" && (f.source === "stability" || f.source === "efa")).length;
  stabScore -= stabErrors * 0.05;
  const factorStabilityScore = clamp(stabScore, 0, 1);

  // Overall: weighted average
  const overall =
    dataQuality * 0.15 +
    reliabilityScore * 0.35 +
    validityScore * 0.25 +
    factorStabilityScore * 0.25;

  // Level
  let level: ConfidenceScore["level"];
  if (overall >= 0.80) level = "HIGH";
  else if (overall >= 0.60) level = "MEDIUM";
  else if (overall >= 0.40) level = "LOW";
  else level = "UNRELIABLE";

  return {
    dataQuality: round(dataQuality),
    reliability: round(reliabilityScore),
    validity: round(validityScore),
    factorStability: round(factorStabilityScore),
    overall: round(overall),
    level,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
