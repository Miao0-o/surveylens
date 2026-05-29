// ============================================================
// Scale Structure Consistency Check
// Compares metadata-defined scales against EFA factor structure.
// Answers: "Do the user-defined scales match observed factors?"
// ============================================================

import type { StructuredComposite } from "@/lib/stats/composite";

export interface ScaleConsistencyResult {
  scaleLabel: string;
  sourceItems: string[];
  totalItems: number;
  matchedItems: number; // items found in EFA labels
  dominantFactor: number;
  dominantCount: number;
  consistency: number; // 0–1
  // Per-item factor assignments
  itemFactors: { item: string; factor: number; loading: number }[];
  // Cross-loading items (not on dominant factor)
  crossLoaded: { item: string; assignedTo: number; loading: number }[];
  interpretation: "excellent" | "good" | "moderate" | "poor";
  summary: string;
}

export interface ScaleConsistencyReport {
  results: ScaleConsistencyResult[];
  overview: {
    totalScales: number;
    supportedCount: number;   // consistency >= 0.80
    reviewCount: number;       // consistency < 0.80
    averageConsistency: number;
  };
}

/**
 * Compute scale-level factor consistency.
 *
 * @param composites - user-defined scales from research design
 * @param efaLoadings - loading matrix (items × factors)
 * @param efaItemLabels - item names matching loading rows
 * @param en - language flag
 */
export function computeScaleConsistency(
  composites: StructuredComposite[],
  efaLoadings: number[][],
  efaItemLabels: string[],
  en: boolean
): ScaleConsistencyReport | null {
  if (composites.length === 0 || efaLoadings.length === 0) return null;

  const nFactors = efaLoadings[0]?.length ?? 0;
  if (nFactors === 0) return null;

  const results: ScaleConsistencyResult[] = [];

  for (const c of composites) {
    const itemFactors: ScaleConsistencyResult["itemFactors"] = [];
    let matchedItems = 0;

    for (const item of c.sourceItems) {
      const idx = efaItemLabels.indexOf(item);
      if (idx < 0) continue;
      matchedItems++;

      const row = efaLoadings[idx];
      // Find factor with highest absolute loading
      let bestFactor = 0;
      let bestLoading = Math.abs(row[0]);
      for (let f = 1; f < row.length; f++) {
        const absL = Math.abs(row[f]);
        if (absL > bestLoading) {
          bestLoading = absL;
          bestFactor = f;
        }
      }
      itemFactors.push({ item, factor: bestFactor + 1, loading: row[bestFactor] });
    }

    // Determine dominant factor (most items assigned to it by highest loading)
    const factorCounts = new Map<number, number>();
    for (const { factor } of itemFactors) {
      factorCounts.set(factor, (factorCounts.get(factor) ?? 0) + 1);
    }
    let dominantFactor = 1;
    let dominantCount = 0;
    for (const [f, count] of factorCounts) {
      if (count > dominantCount) {
        dominantCount = count;
        dominantFactor = f;
      }
    }

    // Loading-strength-weighted consistency:
    // Each item contributes its "dominance ratio" = dominant_loading² / Σ(all squared loadings)
    // This penalizes items that have similar loadings on multiple factors.
    const totalItems = itemFactors.length;
    let weightedSum = 0;
    const crossLoaded: ScaleConsistencyResult["crossLoaded"] = [];
    for (const { item, factor, loading } of itemFactors) {
      // Compute all squared loadings for this item across all factors
      const itemIdx = efaItemLabels.indexOf(item);
      let sumSq = 0;
      if (itemIdx >= 0) {
        for (const l of efaLoadings[itemIdx]) {
          sumSq += l * l;
        }
      }
      const dominance = sumSq > 0 ? (loading * loading) / sumSq : 1;
      if (factor === dominantFactor) {
        weightedSum += dominance;
      } else {
        weightedSum += (1 - dominance); // penalized contribution
        // Only flag as genuinely cross-loaded if dominance < 0.50 (ambiguous assignment)
        if (dominance < 0.50) {
          crossLoaded.push({ item, assignedTo: factor, loading });
        }
      }
    }
    const consistency = totalItems > 0 ? weightedSum / totalItems : 0;

    let interpretation: ScaleConsistencyResult["interpretation"];
    let summary: string;
    if (consistency >= 0.90) {
      interpretation = "excellent";
      summary = en
        ? "Scale structure strongly supported by factor analysis."
        : "因子结构有力支持了该量表的构念定义。";
    } else if (consistency >= 0.80) {
      interpretation = "good";
      summary = en
        ? "Scale structure broadly supported. Minor cross-loading present."
        : "量表结构基本得到支持，存在轻微交叉载荷。";
    } else if (consistency >= 0.70) {
      interpretation = "moderate";
      summary = en
        ? "Some items show ambiguous factor assignment. Scale structure may need review."
        : "部分题项因子归属不够明确，量表结构可能需要审视。";
    } else {
      interpretation = "poor";
      summary = en
        ? "Multiple items show ambiguous or conflicting factor assignments. Scale may not match observed structure."
        : "多个题项因子归属模糊或冲突，量表构念定义可能不匹配观测结构。";
    }

    results.push({
      scaleLabel: c.label,
      sourceItems: c.sourceItems,
      totalItems: c.sourceItems.length,
      matchedItems,
      dominantFactor,
      dominantCount,
      consistency: Math.round(consistency * 1000) / 1000,
      itemFactors,
      crossLoaded,
      interpretation,
      summary,
    });
  }

  const totalScales = results.length;
  const supportedCount = results.filter(r => r.consistency >= 0.80).length;
  const reviewCount = totalScales - supportedCount;
  const averageConsistency = totalScales > 0
    ? Math.round((results.reduce((s, r) => s + r.consistency, 0) / totalScales) * 1000) / 1000
    : 0;

  return {
    results,
    overview: {
      totalScales,
      supportedCount,
      reviewCount,
      averageConsistency,
    },
  };
}
