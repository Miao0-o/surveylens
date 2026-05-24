// ============================================================
// AI信效度分析系统 - Type Definitions
// schemaVersion: 1.0.0
// ============================================================

// ---- Pipeline State ----
export type PipelineState =
  | "idle"
  | "processing"
  | "ai_processing"
  | "completed"
  | "error";

export type PipelineStep =
  | "upload"
  | "preprocess"
  | "analysis"
  | "stability"
  | "ai"
  | "export";

// ---- Upload ----
export interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  colCount: number;
  fileName: string;
  fileType: "csv" | "xlsx" | "qualtrics";
}

export interface ColumnInfo {
  name: string;
  type: "numeric" | "text" | "likert" | "id" | "unknown";
  uniqueValues: number;
  min?: number;
  max?: number;
  mean?: number;
  missingCount: number;
}

// ---- Preprocessing ----
export interface ReverseItemWarning {
  column: string;
  reason: "negative_correlation" | "semantic_opposite" | "low_item_total";
  confidence: "high" | "medium" | "low";
}

export interface MissingStrategy {
  method: "listwise" | "mean_imputation";
  threshold: number; // max fraction of missing per row/col
}

// ---- Dimension / Grouping ----
export interface DimensionGroup {
  name: string;
  items: string[];
}

// ---- Statistical Results (Standardized Schema v1.0.0) ----
export interface AnalysisMeta {
  schemaVersion: "1.0.0";
  sampleSize: number;
  itemCount: number;
  dimensionCount: number;
  timestamp: number;
  analysisDurationMs: number;
}

export interface ReliabilityResult {
  cronbachsAlpha: number;
  standardizedAlpha: number;
  itemTotalCorrelation: Record<string, number>;
  alphaIfItemDeleted: Record<string, number>;
}

export interface ValidityResult {
  kmo: number;
  kmoPerItem: Record<string, number>;
  bartlettChiSquare: number;
  bartlettDf: number;
  bartlettPValue: number;
  correlationMatrix: number[][];
  columnLabels: string[];
}

export interface EFAResult {
  eigenvalues: number[];
  loadings: number[][]; // items × factors
  communalities: number[];
  varianceExplained: number[]; // per factor
  rotation: "varimax" | "oblimin";
  suggestedFactors: number;
  itemLabels: string[];
}

export interface StabilityResult {
  bootstrapSamples: number;
  alphaCurve: { sampleSize: number; alpha: number }[];
  stabilityLevel: "stable" | "moderate" | "unstable";
  recommendedSampleSize: number;
  elbowPoint: number | null;
}

export interface AnalysisResults {
  meta: AnalysisMeta;
  reliability: ReliabilityResult;
  validity: ValidityResult;
  efa: EFAResult;
  stability: StabilityResult;
  recommendedMethod: string;
}

// ---- AI Compressed Input (Result Reducer output) ----
export interface AICompressedInput {
  alpha: number;
  lowItems: string[];
  kmo: number;
  problematicItems: string[];
  crossLoadingItems: string[];
  stabilityLevel: string;
  recommendedSampleSize: number;
  factorLoadings: { item: string; factor: number; loading: number }[];
  researchGoal: string;
}

// ---- AI Results ----
export interface AIExplanation {
  simple: string;
  academic: string;
}

export interface AIAdvisorSuggestion {
  item?: string;
  severity: "warning" | "suggestion" | "info";
  title: string;
  detail: string;
}

export interface AIResults {
  explanation: AIExplanation;
  suggestions: AIAdvisorSuggestion[];
  diagnosis: {
    lowReliabilityItems: string[];
    crossLoadingItems: string[];
    reverseItemRisks: string[];
  };
  apaResult: string;
}

// ---- App State ----
export interface AppState {
  // Data
  rawData: ParsedData | null;
  columns: ColumnInfo[];
  likertColumns: string[];
  reverseItemWarnings: ReverseItemWarning[];
  dimensions: DimensionGroup[];

  // Research info
  researchGoal: string;
  theoreticalDimensions: string;

  // Pipeline
  pipelineState: PipelineState;
  pipelineStep: PipelineStep;
  progress: number; // 0-100
  error: string | null;

  // Results
  results: AnalysisResults | null;
  aiResults: AIResults | null;

  // Config
  apiKey: string;
  missingStrategy: MissingStrategy;
}
