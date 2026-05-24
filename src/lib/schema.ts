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
    },
    reliability: {
      cronbachsAlpha: 0,
      standardizedAlpha: 0,
      itemTotalCorrelation: {},
      alphaIfItemDeleted: {},
    },
    validity: {
      kmo: 0,
      kmoPerItem: {},
      bartlettChiSquare: 0,
      bartlettDf: 0,
      bartlettPValue: 0,
      correlationMatrix: [],
      columnLabels: [],
    },
    efa: {
      eigenvalues: [],
      loadings: [],
      communalities: [],
      varianceExplained: [],
      rotation: "varimax",
      suggestedFactors: 0,
      itemLabels: [],
    },
    stability: {
      bootstrapSamples: 0,
      alphaCurve: [],
      stabilityLevel: "unstable",
      recommendedSampleSize: 0,
      elbowPoint: null,
    },
    recommendedMethod: "",
  };
}

export function validateSchema(results: AnalysisResults): boolean {
  return results.meta.schemaVersion === CURRENT_SCHEMA_VERSION;
}
