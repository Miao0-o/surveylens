// ============================================================
// AI Context Compression Layer (Result Reducer)
// Reduces full AnalysisResults → AICompressedInput (~500 bytes)
// Runs AFTER stats computation, BEFORE sending to Claude API
// ============================================================

import type { AnalysisResults, AICompressedInput } from "@/types";

export function compressResults(
  results: AnalysisResults,
  researchGoal: string
): AICompressedInput {
  const { reliability, validity, efa, stability } = results;

  // Identify low-reliability items (alpha-if-deleted improves alpha by > 0.02)
  const lowItems: string[] = [];
  const baseAlpha = reliability.cronbachsAlpha;
  for (const [item, alphaIfDel] of Object.entries(reliability.alphaIfItemDeleted)) {
    if (alphaIfDel !== null && alphaIfDel - baseAlpha > 0.02) {
      lowItems.push(item);
    }
  }

  // Identify problematic items (KMO per item < 0.60)
  const problematicItems: string[] = [];
  for (const [item, kmo] of Object.entries(validity.kmoPerItem)) {
    if (kmo < 0.6) {
      problematicItems.push(item);
    }
  }

  // Identify cross-loading items (max loading difference < 0.20)
  const crossLoadingItems: string[] = [];
  if (efa.loadings.length > 0 && efa.loadings[0].length > 1) {
    for (let i = 0; i < efa.loadings.length; i++) {
      const row = efa.loadings[i];
      const sorted = [...row].sort((a, b) => b - a);
      if (sorted.length >= 2 && sorted[0] - sorted[1] < 0.2) {
        const label = efa.itemLabels[i] ?? `Item_${i}`;
        crossLoadingItems.push(label);
      }
    }
  }

  // Extract top factor loadings (loading > 0.3)
  const factorLoadings: { item: string; factor: number; loading: number }[] = [];
  for (let i = 0; i < efa.loadings.length; i++) {
    const row = efa.loadings[i];
    for (let f = 0; f < row.length; f++) {
      if (Math.abs(row[f]) >= 0.3) {
        factorLoadings.push({
          item: efa.itemLabels[i] ?? `Item_${i}`,
          factor: f + 1,
          loading: Math.round(row[f] * 1000) / 1000,
        });
      }
    }
  }

  return {
    alpha: Math.round(baseAlpha * 1000) / 1000,
    lowItems,
    kmo: Math.round(validity.kmo * 1000) / 1000,
    problematicItems,
    crossLoadingItems,
    stabilityLevel: stability.stabilityLevel,
    recommendedSampleSize: stability.recommendedSampleSize,
    factorLoadings,
    researchGoal,
  };
}
