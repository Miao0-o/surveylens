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

function saveRawData(data: unknown): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(RAW_DATA_KEY, JSON.stringify(data)); } catch {}
}
function loadRawData(): unknown {
  if (typeof window === "undefined") return null;
  try { const r = localStorage.getItem(RAW_DATA_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveLikertCols(cols: string[]): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LIKERT_KEY, JSON.stringify(cols)); } catch {}
}
function loadLikertCols(): string[] {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(LIKERT_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
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
  setValidationReport: (report: ValidationReport) => void;
  setAIResults: (aiResults: AIResults | null) => void;
  checkAICache: () => AIResults | null;
  clearAICache: () => void;

  // Config
  setAnalysisMode: (mode: AnalysisMode) => void;
  setApiKey: (key: string) => void;
  setMissingStrategy: (strategy: MissingStrategy) => void;
  setDesignConfirmed: (confirmed: boolean) => void;

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
  validationReport: null,
  aiResults: null,

  analysisMode: "quick",
  designConfirmed: false,

  apiKey: "", // loaded from sessionStorage on client
  missingStrategy: initialMissingStrategy,
};

export const useAppStore = create<AppState & AppActions>()((set) => ({
  ...initialState,
  apiKey: loadApiKey(),

  // ---- Data ----
  setRawData: (data) => {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(RAW_DATA_KEY, json);
      console.log("[persist] rawData saved, size:", json.length, "bytes");
    } catch (e) {
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        // Quota full — try clearing other projects' keys to make room
        console.warn("[persist] Quota exceeded, cleaning old keys...");
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k !== RAW_DATA_KEY && k !== LIKERT_KEY && !k.startsWith("ai-")) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          localStorage.removeItem(k);
          console.log("[persist] removed:", k);
        }
        // Retry
        try {
          const json = JSON.stringify(data);
          localStorage.setItem(RAW_DATA_KEY, json);
          console.log("[persist] rawData saved after cleanup, size:", json.length, "bytes");
        } catch (e2) {
          console.error("[persist] Still failed after cleanup:", e2);
        }
      } else {
        console.error("[persist] rawData save failed:", e);
      }
    }
    return set({ rawData: data, pipelineStep: "upload", analysisStage: "uploading", error: null });
  },

  setLikertColumns: (cols) => {
    try { localStorage.setItem(LIKERT_KEY, JSON.stringify(cols)); } catch (e) { console.error("[persist] likert save failed:", e); }
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
  setApiKey: (key) => {
    saveApiKey(key);
    set({ apiKey: key });
  },

  setMissingStrategy: (strategy) => set({ missingStrategy: strategy }),

  // ---- Hydrate ----
  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(RAW_DATA_KEY);
      const likert = localStorage.getItem(LIKERT_KEY);
      console.log("[persist] hydrate — rawData:", raw ? `found (${raw.length} chars)` : "not found",
        "| likert:", likert ? `found` : "not found");
      if (raw) set({ rawData: JSON.parse(raw) });
      if (likert) set({ likertColumns: JSON.parse(likert) });
    } catch (e) {
      console.error("[persist] hydrate failed:", e);
    }
  },

  // ---- Reset ----
  reset: () => {
    try { localStorage.removeItem(RAW_DATA_KEY); localStorage.removeItem(LIKERT_KEY); } catch {}
    set({
      ...initialState,
      apiKey: loadApiKey(),
      aiMode: useAppStore.getState().aiMode,
    });
  },
}));
