// ============================================================
// AI信效度分析系统 - Type Definitions
// schemaVersion: 1.0.0
// ============================================================

import type { ClassificationResult } from "@/lib/stats/data-classifier";

// ---- Pipeline State (coarse) ----
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

// ---- Analysis Stage (fine-grained for progress UI) ----
export type AnalysisStage =
  | "idle"
  | "uploading"
  | "parsing"
  | "cleaning"
  | "grouping"
  | "reliability"
  | "validity"
  | "efa"
  | "stability"
  | "ai"
  | "completed"
  | "error";

export const STAGE_LABELS: Record<AnalysisStage, string> = {
  idle: "",
  uploading: "正在读取文件...",
  parsing: "正在解析数据...",
  cleaning: "正在检测缺失值与反向题...",
  grouping: "正在构建维度分组...",
  reliability: "正在计算 Cronbach's α...",
  validity: "正在进行 Bartlett 球形检验...",
  efa: "正在生成因子结构...",
  stability: "正在进行 Bootstrap 稳定性评估...",
  ai: "AI 正在生成解读...",
  completed: "分析完成",
  error: "分析出错",
};

// ---- AI Connection Mode ----
export type AIMode = "none" | "configured" | "connected" | "offline";

// ---- AI Streaming Stage ----
export type AIStreamingStage =
  | "idle"
  | "interpreting_reliability"
  | "interpreting_validity"
  | "diagnosing"
  | "generating_apa"
  | "done"
  | "error";

export const AI_STREAM_LABELS: Record<AIStreamingStage, string> = {
  idle: "",
  interpreting_reliability: "正在分析信度结果...",
  interpreting_validity: "正在解读效度指标...",
  diagnosing: "正在生成诊断建议...",
  generating_apa: "正在生成 APA 结果...",
  done: "AI 解读完成",
  error: "AI 解读出错",
};

// ---- Upload ----
export interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  colCount: number;
  fileName: string;
  fileType: "csv" | "xlsx" | "qualtrics" | "sav" | "dta";
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
  threshold: number;
}

// ---- Dimension / Grouping ----
export interface DimensionGroup {
  name: string;
  items: string[];
}

// ---- Analysis Mode ----
export type AnalysisMode = "quick" | "custom";

// ---- Research Design (structured schema) ----
export type AnalysisIntent = "prediction" | "explanation" | "validation" | "exploration";

export type ComputeMethod = "mean" | "sum" | "weighted_mean" | "factor_score";

export interface ComputedVariable {
  name: string;
  method: ComputeMethod;
  sourceItems: string[];
}

export interface ResearchDesign {
  researchGoal: string;
  analysisIntent: AnalysisIntent;
  outcomes: ComputedVariable[];
  outcomeVariables: string[];  // legacy: flattened for backward compat
  predictorVariables: string[];
  theoreticalFramework: string;
  hypotheses: string;
  freeNotes: string;
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
  mcdonaldsOmega: number;
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
  loadings: number[][];
  communalities: number[];
  varianceExplained: number[];
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

// ---- Validation Report (Layer 2) ----
export interface ValidationFlag {
  type: "error" | "warning" | "info";
  source: "reliability" | "validity" | "efa" | "stability";
  code: string;
  message: string;
}

export interface ConfidenceScore {
  dataQuality: number;
  reliability: number;
  validity: number;
  factorStability: number;
  overall: number;
  level: "HIGH" | "MEDIUM" | "LOW" | "UNRELIABLE";
}

export interface ValidationReport {
  flags: ValidationFlag[];
  confidence: ConfidenceScore;
  passed: boolean;
  timestamp: number;
  version: string;
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
  shortAPA: string;
  /** Cache key to avoid re-running on same results */
  cachedAt?: number;
}

// ---- App State ----
export interface AppState {
  // Data
  rawData: ParsedData | null;
  columns: ColumnInfo[];
  classification: ClassificationResult | null;
  likertColumns: string[];
  reverseItemWarnings: ReverseItemWarning[];
  dimensions: DimensionGroup[];

  // Research info
  researchDesign: ResearchDesign | null;
  researchGoal: string;
  theoreticalDimensions: string;

  // Pipeline
  pipelineState: PipelineState;
  pipelineStep: PipelineStep;
  analysisStage: AnalysisStage;
  progress: number;
  error: string | null;

  // AI
  aiMode: AIMode;
  aiStreamingStage: AIStreamingStage;
  aiError: string | null;

  // Results
  results: AnalysisResults | null;
  descriptiveResults: Record<string, unknown>[] | null;
  validationReport: ValidationReport | null;
  aiResults: AIResults | null;

  // Analysis mode + design lock
  analysisMode: AnalysisMode;
  designConfirmed: boolean;

  // Config
  apiKey: string;
  missingStrategy: MissingStrategy;
  reportLanguage: "zh" | "en";
}
