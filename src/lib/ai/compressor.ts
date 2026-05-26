// ============================================================
// AI Context Compression Layer (Result Reducer)
// Provides comprehensive data for 3-section AI output:
//   1. Statistical interpretation
//   2. Diagnostic suggestions
//   3. APA reporting
// ============================================================

import type { AnalysisResults, AICompressedInput, ResearchDesign } from "@/types";

export function compressResults(
  results: AnalysisResults,
  design?: ResearchDesign | null
): AICompressedInput {
  const researchGoal = design?.researchGoal ?? "";
  const outcomeVariables = design?.outcomeVariables ?? [];
  const predictorVariables = design?.predictorVariables ?? [];
  const theoreticalFramework = design?.theoreticalFramework ?? "";
  const hypotheses = design?.hypotheses ?? "";
  const freeNotes = design?.freeNotes ?? "";
  const { reliability, validity, efa, stability, meta } = results;
  const baseAlpha = reliability.cronbachsAlpha;

  // Low-reliability items (alpha-if-deleted improves alpha by > 0.02)
  const lowItems: string[] = [];
  for (const [item, alphaIfDel] of Object.entries(reliability.alphaIfItemDeleted)) {
    if (alphaIfDel !== null && alphaIfDel - baseAlpha > 0.02) {
      lowItems.push(item);
    }
  }

  // Item-total correlations (for AI to interpret per-item consistency)
  const itemTotalCorrelations = Object.entries(reliability.itemTotalCorrelation)
    .map(([item, corr]) => ({ item, corr: Math.round(corr * 1000) / 1000 }))
    .sort((a, b) => a.corr - b.corr);

  // Problematic KMO items
  const problematicItems: string[] = [];
  for (const [item, kmo] of Object.entries(validity.kmoPerItem)) {
    if (kmo < 0.6) problematicItems.push(item);
  }

  // Cross-loading items
  const crossLoadingItems: string[] = [];
  if (efa.loadings.length > 0 && efa.loadings[0].length > 1) {
    for (let i = 0; i < efa.loadings.length; i++) {
      const row = efa.loadings[i];
      const sorted = [...row].sort((a, b) => b - a);
      if (sorted.length >= 2 && sorted[0] - sorted[1] < 0.2) {
        crossLoadingItems.push(efa.itemLabels[i] ?? `Item_${i}`);
      }
    }
  }

  // Factor loadings
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

  // Dimension/subscale reliabilities
  const dimensionReliabilities = (reliability.dimensions ?? []).map((d) => ({
    name: d.name,
    alpha: Math.round(d.cronbachsAlpha * 1000) / 1000,
    items: d.items.length,
  }));

  // Missing rate (from meta — approximate via item count vs sample)
  const missingRate = 0; // Not directly available from AnalysisResults; set by caller if needed

  // Reverse item count from item-total correlations (negative correlations)
  const reverseItemCount = Object.values(reliability.itemTotalCorrelation).filter((c) => c < 0).length;

  return {
    alpha: Math.round(baseAlpha * 1000) / 1000,
    standardizedAlpha: Math.round(reliability.standardizedAlpha * 1000) / 1000,
    lowItems,
    itemTotalCorrelations,
    kmo: Math.round(validity.kmo * 1000) / 1000,
    bartlettChiSquare: Math.round(validity.bartlettChiSquare * 100) / 100,
    bartlettDf: validity.bartlettDf,
    bartlettPValue: validity.bartlettPValue,
    problematicItems,
    crossLoadingItems,
    stabilityLevel: stability.stabilityLevel,
    recommendedSampleSize: stability.recommendedSampleSize,
    factorLoadings,
    eigenvalues: efa.eigenvalues.slice(0, 10),
    suggestedFactors: efa.suggestedFactors,
    kaiserFactors: efa.metadata?.raw_factor_estimation?.kaiser_n ?? efa.suggestedFactors,
    varianceExplained: Math.round(efa.varianceExplained.reduce((a, b) => a + b, 0) * 10000) / 100,
    sampleSize: meta.sampleSize,
    itemCount: meta.itemCount,
    missingRate,
    reverseItemCount,
    dimensionReliabilities,
    researchGoal,
    outcomeVariables,
    predictorVariables,
    theoreticalFramework,
    hypotheses,
    freeNotes,
  };
}
