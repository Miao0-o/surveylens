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
import type { CodebookSchema, MappingFreeze } from "@/lib/codebook/schema";
import type { ResearchDesign, AnalysisMode, RepairState } from "@/types";

const AI_KEY_STORAGE = "survey-lens-key";
const AI_MODEL_STORAGE = "survey-lens-model";
const AI_PROVIDER_STORAGE = "survey-lens-provider";
const AI_RESULTS_CACHE = "survey-lens-cache";
const RAW_DATA_KEY = "survey-lens-rawdata";
const LIKERT_KEY = "survey-lens-likert";

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

function loadAIModel(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(AI_MODEL_STORAGE) ?? "";
}

function loadAIProvider(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(AI_PROVIDER_STORAGE) ?? "";
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
  setCodebook: (cb: CodebookSchema) => void;
  setMappingFreeze: (freeze: MappingFreeze | null) => void;
  setColumns: (columns: ColumnInfo[]) => void;
  setClassification: (result: ClassificationResult) => void;
  setLikertColumns: (cols: string[]) => void;
  setReverseItemWarnings: (warnings: ReverseItemWarning[]) => void;
  setConfirmedReverseItems: (items: string[]) => void;
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
  setAIModel: (model: string) => void;
  setAIProvider: (provider: string) => void;
  setAIStrictMode: (strict: boolean) => void;
  setAIStreamingStage: (stage: AIStreamingStage) => void;
  setAIError: (err: string | null) => void;

  // Results
  setResults: (results: AnalysisResults) => void;
  setPreviousResults: (results: AnalysisResults | null) => void;
  setDescriptiveResults: (data: Record<string, unknown>[] | null) => void;
  setValidationReport: (report: ValidationReport) => void;
  setAIResults: (aiResults: AIResults | null) => void;
  checkAICache: () => AIResults | null;
  clearAICache: () => void;

  // Repair workflow
  setRepairAction: (action: RepairState["currentAction"]) => void;
  applyFix: (fix: keyof RepairState["appliedFixes"]) => void;
  resetRepair: () => void;

  // UI
  setLeftStep: (step: string) => void;

  // Config
  setAnalysisMode: (mode: AnalysisMode) => void;
  setApiKey: (key: string) => void;
  setMissingStrategy: (strategy: MissingStrategy) => void;
  setDesignConfirmed: (confirmed: boolean) => void;
  setReportLanguage: (lang: "zh" | "en") => void;

  // Session
  lastActivityAt: number;
  touchActivity: () => void;
  setDataWarnings: (w: string[]) => void;
  triggerReRun: number;
  requestReRun: () => void;
  clearAnalysisSession: () => void;

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
  datasetVersion: 0,
  codebook: null,
  mappingFreeze: null,
  columns: [],
  classification: null,
  likertColumns: [],
  reverseItemWarnings: [],
  confirmedReverseItems: [],
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
  aiModel: typeof window !== "undefined" ? loadAIModel() : "",
  aiProvider: typeof window !== "undefined" ? loadAIProvider() : "",
  aiStrictMode: false,
  aiStreamingStage: "idle",
  aiError: null,

  results: null,
  previousResults: null,
  descriptiveResults: null,
  validationReport: null,
  aiResults: null,

  analysisMode: "quick",
  designConfirmed: false,

  lastActivityAt: typeof window !== "undefined" ? Date.now() : 0,

  dataWarnings: [],

  triggerReRun: 0,

  leftStep: "upload",

  repair: {
    currentAction: null,
    appliedFixes: { missing: false, reverse: false, weakItems: false },
    dirty: false,
  },

  apiKey: "",
  missingStrategy: initialMissingStrategy,
  reportLanguage: "zh",
};

export const useAppStore = create<AppState & AppActions>()((set) => ({
  ...initialState,
  apiKey: loadApiKey(),

  // ---- Data ----
  setRawData: (data) => {
    return set((s) => ({
      rawData: data,
      datasetVersion: s.datasetVersion + 1,
      mappingFreeze: null,
      pipelineStep: "upload",
      analysisStage: "uploading",
      error: null,
    }));
  },

  setCodebook: (codebook) => set({ codebook }),

  setMappingFreeze: (mappingFreeze) => set({ mappingFreeze }),

  setLikertColumns: (cols) => set({ likertColumns: cols }),

  setColumns: (columns) => set({ columns }),
  setClassification: (classification) => set({ classification }),
  setReverseItemWarnings: (warnings) => set({ reverseItemWarnings: warnings }),
  setConfirmedReverseItems: (confirmedReverseItems) => set({ confirmedReverseItems }),
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
  setAIModel: (aiModel) => {
    if (typeof window !== "undefined") sessionStorage.setItem(AI_MODEL_STORAGE, aiModel);
    set({ aiModel });
  },
  setAIStrictMode: (aiStrictMode) => set({ aiStrictMode }),

  setAIProvider: (aiProvider) => {
    if (typeof window !== "undefined") sessionStorage.setItem(AI_PROVIDER_STORAGE, aiProvider);
    set({ aiProvider });
  },
  setAIStreamingStage: (aiStreamingStage) => set({ aiStreamingStage }),
  setAIError: (aiError) => set({ aiError }),

  // ---- Results ----
  setResults: (results) => set({ results }),
  setPreviousResults: (previousResults) => set({ previousResults }),
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

  // ---- Reset + Hydrate ----
  setApiKey: (key) => {
    saveApiKey(key);
    set({ apiKey: key });
  },

  setMissingStrategy: (strategy) => set({ missingStrategy: strategy }),

  setLeftStep: (leftStep) => set({ leftStep }),

  setDataWarnings: (dataWarnings) => set({ dataWarnings }),

  requestReRun: () => set((s) => ({ triggerReRun: s.triggerReRun + 1 })),

  touchActivity: () => {
    const ts = Date.now();
    if (typeof window !== "undefined") {
      try { sessionStorage.setItem("ai-session-activity", String(ts)); } catch {}
    }
    set({ lastActivityAt: ts });
  },

  clearAnalysisSession: () => {
    idbRemove(RAW_DATA_KEY);
    idbRemove(LIKERT_KEY);
    if (typeof window !== "undefined") {
      try {
        const keys = Object.keys(sessionStorage).filter(k => k.startsWith("survey-lens-"));
        keys.forEach(k => sessionStorage.removeItem(k));
      } catch {}
    }
    set({
      rawData: null,
      codebook: null,
      mappingFreeze: null,
      columns: [],
      classification: null,
      likertColumns: [],
      reverseItemWarnings: [],
      confirmedReverseItems: [],
      dimensions: [],
      researchDesign: null,
      researchGoal: "",
      theoreticalDimensions: "",
      pipelineState: "idle",
      pipelineStep: "upload",
      analysisStage: "idle",
      progress: 0,
      error: null,
      dataWarnings: [],
      results: null,
      previousResults: null,
      descriptiveResults: null,
      validationReport: null,
      aiResults: null,
      designConfirmed: false,
      repair: { currentAction: null, appliedFixes: { missing: false, reverse: false, weakItems: false }, dirty: false },
      leftStep: "upload",
    });
  },

  setRepairAction: (currentAction) => set((s) => ({ repair: { ...s.repair, currentAction } })),
  applyFix: (fix) => set((s) => ({
    repair: {
      ...s.repair,
      appliedFixes: { ...s.repair.appliedFixes, [fix]: true },
      dirty: true,
    },
  })),
  resetRepair: () => set({
    repair: { currentAction: null, appliedFixes: { missing: false, reverse: false, weakItems: false }, dirty: false },
  }),

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
