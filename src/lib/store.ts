// ============================================================
// Global State Machine (Zustand)
// 3-layer pipeline model: idle → processing → ai_processing → completed
// step tracking: upload → preprocess → analysis → stability → ai → export
// ============================================================

import { create } from "zustand";
import type {
  AppState,
  PipelineState,
  PipelineStep,
  ParsedData,
  ColumnInfo,
  ReverseItemWarning,
  DimensionGroup,
  AnalysisResults,
  AIResults,
  MissingStrategy,
} from "@/types";

interface AppActions {
  // Data
  setRawData: (data: ParsedData) => void;
  setColumns: (columns: ColumnInfo[]) => void;
  setLikertColumns: (cols: string[]) => void;
  setReverseItemWarnings: (warnings: ReverseItemWarning[]) => void;
  setDimensions: (dims: DimensionGroup[]) => void;

  // Research info
  setResearchGoal: (goal: string) => void;
  setTheoreticalDimensions: (dims: string) => void;

  // Pipeline
  setPipelineState: (state: PipelineState) => void;
  setPipelineStep: (step: PipelineStep) => void;
  setProgress: (pct: number) => void;
  setError: (err: string | null) => void;

  // Transition helpers
  startProcessing: (step: PipelineStep) => void;
  completeProcessing: () => void;
  failProcessing: (err: string) => void;

  // Results
  setResults: (results: AnalysisResults) => void;
  setAIResults: (aiResults: AIResults) => void;

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
  likertColumns: [],
  reverseItemWarnings: [],
  dimensions: [],

  researchGoal: "",
  theoreticalDimensions: "",

  pipelineState: "idle",
  pipelineStep: "upload",
  progress: 0,
  error: null,

  results: null,
  aiResults: null,

  apiKey: "",
  missingStrategy: initialMissingStrategy,
};

export const useAppStore = create<AppState & AppActions>()((set) => ({
  ...initialState,

  // ---- Data ----
  setRawData: (data) =>
    set({
      rawData: data,
      pipelineStep: "upload",
      error: null,
    }),

  setColumns: (columns) => set({ columns }),

  setLikertColumns: (cols) => set({ likertColumns: cols }),

  setReverseItemWarnings: (warnings) => set({ reverseItemWarnings: warnings }),

  setDimensions: (dims) => set({ dimensions: dims }),

  // ---- Research info ----
  setResearchGoal: (goal) => set({ researchGoal: goal }),
  setTheoreticalDimensions: (dims) => set({ theoreticalDimensions: dims }),

  // ---- Pipeline ----
  setPipelineState: (pipelineState) => set({ pipelineState }),
  setPipelineStep: (pipelineStep) => set({ pipelineStep }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error, pipelineState: "error" }),

  // ---- Transition helpers ----
  startProcessing: (step) =>
    set({
      pipelineState: step === "ai" ? "ai_processing" : "processing",
      pipelineStep: step,
      progress: 0,
      error: null,
    }),

  completeProcessing: () =>
    set({
      pipelineState: "completed",
      progress: 100,
    }),

  failProcessing: (err) =>
    set({
      pipelineState: "error",
      error: err,
    }),

  // ---- Results ----
  setResults: (results) => set({ results }),
  setAIResults: (aiResults) =>
    set({
      aiResults,
      pipelineState: "completed",
      progress: 100,
    }),

  // ---- Config ----
  setApiKey: (key) =>
    set({ apiKey: key }),

  setMissingStrategy: (strategy) =>
    set({ missingStrategy: strategy }),

  // ---- Reset ----
  reset: () => set({ ...initialState }),
}));
