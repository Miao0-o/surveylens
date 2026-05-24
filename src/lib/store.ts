// ============================================================
// Global State Machine (Zustand)
// - Analysis pipeline with fine-grained stages
// - AI mode tracking (none → configured → connected/offline)
// - sessionStorage for API key (clears on browser close)
// - AI result caching prevents re-calls on tab switch
// ============================================================

import { create } from "zustand";
import { idbGet, idbSet, idbRemove } from "./storage/idb-storage";
import { sanitizeForStorage } from "./stats/sanitize";
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
import type { ResearchDesign, AnalysisMode } from "@/types";

const AI_KEY_STORAGE = "ai-reliability-key";
const AI_RESULTS_CACHE = "ai-reliability-cache";
const RAW_DATA_KEY = "ai-analysis-rawdata";
const LIKERT_KEY = "ai-analysis-likert";
const MODE_KEY = "ai-analysis-mode";

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
  setResearchDesign: (design: ResearchDesign) => void;
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
  setDescriptiveResults: (data: Record<string, unknown>[] | null) => void;
  setValidationReport: (report: ValidationReport) => void;
  setAIResults: (aiResults: AIResults | null) => void;
  checkAICache: () => AIResults | null;
  clearAICache: () => void;

  // Config
  setAnalysisMode: (mode: AnalysisMode) => void;
  setApiKey: (key: string) => void;
  setMissingStrategy: (strategy: MissingStrategy) => void;
  setDesignConfirmed: (confirmed: boolean) => void;
  setReportLanguage: (lang: "zh" | "en") => void;

  // Reset + Hydrate
  reset: () => void;
  hydrate: () => void;
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

  researchDesign: null,
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
  descriptiveResults: null,
  validationReport: null,
  aiResults: null,

  analysisMode: "quick",
  designConfirmed: false,

  apiKey: "",
  missingStrategy: initialMissingStrategy,
  reportLanguage: "zh",
};

export const useAppStore = create<AppState & AppActions>()((set) => ({
  ...initialState,
  apiKey: loadApiKey(),

  // ---- Data ----
  setRawData: (data) => {
    const clean = sanitizeForStorage(data);
    idbSet(RAW_DATA_KEY, clean).catch(() => {});
    return set({ rawData: clean, pipelineStep: "upload", analysisStage: "uploading", error: null });
  },

  setLikertColumns: (cols) => {
    idbSet(LIKERT_KEY, sanitizeForStorage(cols)).catch(() => {});
    return set({ likertColumns: cols });
  },

  setColumns: (columns) => set({ columns }),
  setClassification: (classification) => set({ classification }),
  setReverseItemWarnings: (warnings) => set({ reverseItemWarnings: warnings }),
  setDimensions: (dims) => set({ dimensions: dims }),

  // ---- Research info ----
  setResearchDesign: (researchDesign) => set({ researchDesign }),
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
  setDescriptiveResults: (descriptiveResults) => set({ descriptiveResults }),
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
  setAnalysisMode: (analysisMode) => set({ analysisMode }),
  setDesignConfirmed: (designConfirmed) => set({ designConfirmed }),
  setReportLanguage: (reportLanguage) => set({ reportLanguage }),
  setApiKey: (key) => {
    saveApiKey(key);
    set({ apiKey: key });
  },

  setMissingStrategy: (strategy) => set({ missingStrategy: strategy }),

  // ---- Hydrate ----
  hydrate: () => {
    if (typeof window === "undefined") return;
    idbGet(RAW_DATA_KEY).then((raw) => {
      if (raw) set({ rawData: raw as ParsedData });
    }).catch(() => {});
    idbGet(LIKERT_KEY).then((likert) => {
      if (likert) set({ likertColumns: likert as string[] });
    }).catch(() => {});
  },

  // ---- Reset ----
  reset: () => {
    idbRemove(RAW_DATA_KEY);
    idbRemove(LIKERT_KEY);
    set({
      ...initialState,
      apiKey: loadApiKey(),
      aiMode: useAppStore.getState().aiMode,
    });
  },
}));
