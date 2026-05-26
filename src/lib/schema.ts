// ============================================================
// Standardized Results Schema v1.0.0
// Single source of truth for all downstream consumers:
// visualization, AI compression, export (PDF/Excel)
// ============================================================

import type { AnalysisResults } from "@/types";

export const CURRENT_SCHEMA_VERSION = "1.0.0";

export function createEmptyResults(meta: {
  sampleSize: number;
  itemCount: number;
  dimensionCount: number;
  analysisDurationMs: number;
}): AnalysisResults {
  return {
    meta: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      sampleSize: meta.sampleSize,
      itemCount: meta.itemCount,
      dimensionCount: meta.dimensionCount,
      timestamp: Date.now(),
      analysisDurationMs: meta.analysisDurationMs,
      datasetVersion: 0,
      inputSnapshot: "",
    },
    reliability: {
      cronbachsAlpha: 0, standardizedAlpha: 0, mcdonaldsOmega: 0,
      itemTotalCorrelation: {}, alphaIfItemDeleted: {},
      _meta: { value: null, status: "not_applicable" as const, reason: "Not yet analyzed", confidence: 1.0 },
    },
    validity: {
      kmo: 0, kmoPerItem: {}, bartlettChiSquare: 0, bartlettDf: 0, bartlettPValue: 0,
      correlationMatrix: [], columnLabels: [],
      _meta: { value: null, status: "not_applicable" as const, reason: "Not yet analyzed", confidence: 1.0 },
    },
    efa: {
      eigenvalues: [],
      loadings: [],
      communalities: [],
      varianceExplained: [],
      rotation: "varimax",
      suggestedFactors: 0,
      itemLabels: [],
      metadata: {
        raw_factor_estimation: { kaiser_n: 0, scree_suggestion: null, parallel_analysis_n: null },
        factor_stability: { risk_level: "low" as const, too_many_factors: false, recommended_range: [1, 3] as [number, number], warnings: [] },
        product_decision: { display_factor_n: 0, decision_rule: "", type: "presentation_constraint" as const },
      },
      _meta: { value: null, status: "not_applicable" as const, reason: "Not yet analyzed", confidence: 1.0 },
    },
    stability: {
      bootstrapSamples: 0, alphaCurve: [],
      stabilityLevel: "unstable", recommendedSampleSize: 0, elbowPoint: null,
      _meta: { value: null, status: "not_applicable" as const, reason: "Not yet analyzed", confidence: 1.0 },
    },
    recommendedMethod: "",
  };
}

export function validateSchema(results: AnalysisResults): boolean {
  return results.meta.schemaVersion === CURRENT_SCHEMA_VERSION;
}
