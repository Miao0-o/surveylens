// ============================================================
// Global State Machine (Zustand)
// - Analysis pipeline with fine-grained stages
// - AI mode tracking (none → configured → connected/offline)
// - sessionStorage for API key (clears on browser close)
// - AI result caching prevents re-calls on tab switch
// ============================================================

import { create } from "zustand";
import type {
  AppState,
  PipelineState,
  PipelineStep,
  AnalysisStage,
  AIMode,
  AIStreamingStage,
  ParsedData,
  ColumnInfo,
  ReverseItemWarning,
  DimensionGroup,
  AnalysisResults,
  AIResults,
  ValidationReport,
  MissingStrategy,
} from "@/types";
import type { ClassificationResult } from "@/lib/stats/data-classifier";

const AI_KEY_STORAGE = "ai-reliability-key";
const AI_RESULTS_CACHE = "ai-reliability-cache";

// sessionStorage: persists within tab session, cleared on browser close
function loadApiKey(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(AI_KEY_STORAGE) ?? "";
}

function saveApiKey(key: string): void {
  if (typeof window === "undefined") return;
  if (key) sessionStorage.setItem(AI_KEY_STORAGE, key);
  else sessionStorage.removeItem(AI_KEY_STORAGE);
}

function loadCachedAIResults(): AIResults | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AI_RESULTS_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCachedAIResults(results: AIResults | null): void {
  if (typeof window === "undefined") return;
  if (results) {
    results.cachedAt = Date.now();
    sessionStorage.setItem(AI_RESULTS_CACHE, JSON.stringify(results));
  } else {
    sessionStorage.removeItem(AI_RESULTS_CACHE);
  }
}

interface AppActions {
  // Data
  setRawData: (data: ParsedData) => void;
  setColumns: (columns: ColumnInfo[]) => void;
  setClassification: (result: ClassificationResult) => void;
  setLikertColumns: (cols: string[]) => void;
  setReverseItemWarnings: (warnings: ReverseItemWarning[]) => void;
  setDimensions: (dims: DimensionGroup[]) => void;

  // Research info
  setResearchGoal: (goal: string) => void;
  setTheoreticalDimensions: (dims: string) => void;

  // Pipeline
  setPipelineState: (state: PipelineState) => void;
  setPipelineStep: (step: PipelineStep) => void;
  setAnalysisStage: (stage: AnalysisStage) => void;
  setProgress: (pct: number) => void;
  setError: (err: string | null) => void;
  startProcessing: (step: PipelineStep) => void;
  completeProcessing: () => void;
  failProcessing: (err: string) => void;

  // AI
  setAIMode: (mode: AIMode) => void;
  setAIStreamingStage: (stage: AIStreamingStage) => void;
  setAIError: (err: string | null) => void;

  // Results
  setResults: (results: AnalysisResults) => void;
  setValidationReport: (report: ValidationReport) => void;
  setAIResults: (aiResults: AIResults | null) => void;
  checkAICache: () => AIResults | null;
  clearAICache: () => void;

  // Config
  setApiKey: (key: string) => void;
  setMissingStrategy: (strategy: MissingStrategy) => void;

  // Reset
  reset: () => void;
}

const initialMissingStrategy: MissingStrategy = {
  method: "listwise",
  threshold: 0.3,
};

const initialState: AppState = {
  rawData: null,
  columns: [],
  classification: null,
  likertColumns: [],
  reverseItemWarnings: [],
  dimensions: [],

  researchGoal: "",
  theoreticalDimensions: "",

  pipelineState: "idle",
  pipelineStep: "upload",
  analysisStage: "idle",
  progress: 0,
  error: null,

  aiMode: "none",
  aiStreamingStage: "idle",
  aiError: null,

  results: null,
  validationReport: null,
  aiResults: null,

  apiKey: "", // loaded from sessionStorage on client
  missingStrategy: initialMissingStrategy,
};

export const useAppStore = create<AppState & AppActions>()((set) => ({
  ...initialState,
  apiKey: loadApiKey(),

  // ---- Data ----
  setRawData: (data) =>
    set({ rawData: data, pipelineStep: "upload", analysisStage: "uploading", error: null }),

  setColumns: (columns) => set({ columns }),
  setClassification: (classification) => set({ classification }),
  setLikertColumns: (cols) => set({ likertColumns: cols }),
  setReverseItemWarnings: (warnings) => set({ reverseItemWarnings: warnings }),
  setDimensions: (dims) => set({ dimensions: dims }),

  // ---- Research info ----
  setResearchGoal: (goal) => set({ researchGoal: goal }),
  setTheoreticalDimensions: (dims) => set({ theoreticalDimensions: dims }),

  // ---- Pipeline ----
  setPipelineState: (pipelineState) => set({ pipelineState }),
  setPipelineStep: (pipelineStep) => set({ pipelineStep }),
  setAnalysisStage: (analysisStage) => set({ analysisStage }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error, pipelineState: "error", analysisStage: "error" }),

  startProcessing: (step) =>
    set({
      pipelineState: step === "ai" ? "ai_processing" : "processing",
      pipelineStep: step,
      analysisStage: "reliability",
      progress: 0,
      error: null,
    }),

  completeProcessing: () =>
    set({
      pipelineState: "completed",
      analysisStage: "completed",
      progress: 100,
    }),

  failProcessing: (err) =>
    set({
      pipelineState: "error",
      analysisStage: "error",
      error: err,
    }),

  // ---- AI ----
  setAIMode: (aiMode) => set({ aiMode }),
  setAIStreamingStage: (aiStreamingStage) => set({ aiStreamingStage }),
  setAIError: (aiError) => set({ aiError }),

  // ---- Results ----
  setResults: (results) => set({ results }),
  setValidationReport: (validationReport) => set({ validationReport }),
  setAIResults: (aiResults) => {
    saveCachedAIResults(aiResults);
    set({
      aiResults,
      pipelineState: aiResults ? "completed" : undefined,
      aiStreamingStage: aiResults ? "done" : "idle",
    });
  },

  checkAICache: () => {
    return loadCachedAIResults();
  },

  clearAICache: () => {
    saveCachedAIResults(null);
    set({ aiResults: null, aiStreamingStage: "idle" });
  },

  // ---- Config ----
  setApiKey: (key) => {
    saveApiKey(key);
    set({ apiKey: key });
  },

  setMissingStrategy: (strategy) => set({ missingStrategy: strategy }),

  // ---- Reset ----
  reset: () =>
    set({
      ...initialState,
      apiKey: loadApiKey(), // preserve API key across resets
      aiMode: useAppStore.getState().aiMode, // preserve AI mode
    }),
}));
