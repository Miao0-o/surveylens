// ============================================================
// Analysis Pipeline Orchestrator
// Coordinates: preworker → stats-worker → AI
// Each step is a pure function: input → output
// ============================================================

import type { PipelineStep, ParsedData, ColumnInfo, MissingStrategy, DimensionGroup, AnalysisResults } from "@/types";

export type PipelineStepFn<I, O> = (input: I) => Promise<O>;

export interface PipelineContext {
  rawData: ParsedData;
  researchGoal: string;
  theoreticalDimensions: string;
  missingStrategy: MissingStrategy;
  dimensions: DimensionGroup[];
  onProgress: (step: PipelineStep, pct: number) => void;
}

/**
 * Main pipeline: executes all steps in sequence.
 * Steps 1-3 (parse/clean/likert) run in preworker (no Pyodide).
 * Steps 4-7 (reliability/validity/efa/stability) run in stats-worker (Pyodide).
 * Step 8 (AI interpretation) runs via Claude API proxy.
 */
export async function runPipeline(ctx: PipelineContext): Promise<AnalysisResults> {
  const steps: PipelineStep[] = [
    "upload",
    "preprocess",
    "analysis",
    "stability",
    "ai",
  ];

  // Placeholder — will be implemented in Phase 2-5
  // The real implementation will:
  // 1. Spawn preworker → parse, clean, identify Likert, detect reverse items
  // 2. Spawn stats-worker (Pyodide) → reliability, validity, EFA, bootstrap
  // 3. Run result reducer inside worker → produce AICompressedInput
  // 4. Send compressed input to Claude API proxy → AIResults
  // 5. Return complete AnalysisResults

  for (const step of steps) {
    ctx.onProgress(step, 0);
    // ... step execution
    ctx.onProgress(step, 100);
  }

  throw new Error("Pipeline not yet implemented — coming in Phase 2-5");
}

/**
 * Stage 1 (Preworker): Parse raw data into column info.
 * Runs in a lightweight Web Worker (no Pyodide).
 */
export async function parseAndProfile(data: ParsedData): Promise<ColumnInfo[]> {
  // Placeholder — Phase 2
  return data.headers.map((name) => ({
    name,
    type: "unknown" as const,
    uniqueValues: 0,
    missingCount: 0,
  }));
}
