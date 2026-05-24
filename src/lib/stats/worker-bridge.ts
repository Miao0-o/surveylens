// ============================================================
// Main Thread ↔ Pyodide Worker Bridge
// Manages worker lifecycle, sends analysis commands, receives results
// ============================================================

import type { AnalysisResults } from "@/types";
import {
  RELIABILITY_PY,
  VALIDITY_PY,
  EFA_PY,
  STABILITY_PY,
  MAIN_PY,
} from "./python-code";
import { CURRENT_SCHEMA_VERSION, createEmptyResults } from "../schema";

type ProgressCallback = (stage: string, message: string) => void;

interface WorkerRequest {
  id?: string;
  type: string;
  payload?: unknown;
}

interface WorkerResponse {
  id?: string;
  type: string;
  payload?: unknown;
}

// Build complete Python script
function buildPythonCode(): string {
  return [RELIABILITY_PY, VALIDITY_PY, EFA_PY, STABILITY_PY, MAIN_PY].join("\n\n");
}

export class StatsWorkerBridge {
  private worker: Worker | null = null;
  private ready = false;
  private pendingRequests = new Map<string, (res: WorkerResponse) => void>();
  private loadPromise: Promise<void> | null = null;
  private onProgress: ProgressCallback | null = null;

  constructor(onProgress?: ProgressCallback) {
    this.onProgress = onProgress ?? null;
  }

  async initialize(): Promise<void> {
    if (this.ready) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(new URL("./worker.ts", import.meta.url));

        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const msg = e.data;

          if (msg.type === "progress" && this.onProgress) {
            const p = msg.payload as { stage: string; message: string };
            this.onProgress(p.stage, p.message);
          }

          if (msg.type === "init_done") {
            this.ready = true;
            resolve();
          }

          if (msg.type === "init_error") {
            reject(new Error(msg.payload as string));
          }

          // Handle pending request responses
          if (msg.id && this.pendingRequests.has(msg.id)) {
            const cb = this.pendingRequests.get(msg.id)!;
            cb(msg);
            this.pendingRequests.delete(msg.id);
          }
        };

        this.worker.onerror = (err) => {
          reject(new Error(`Worker error: ${err.message}`));
        };

        this.worker.postMessage({ type: "init" });
      } catch (err) {
        reject(err);
      }
    });

    return this.loadPromise;
  }

  async runAnalysis(params: {
    data: number[][];
    itemLabels: string[];
    rotation?: "varimax" | "oblimin";
    nBootstrap?: number;
  }): Promise<AnalysisResults> {
    if (!this.ready || !this.worker) {
      throw new Error("Worker not initialized. Call initialize() first.");
    }

    const id = crypto.randomUUID();
    const promise = new Promise<AnalysisResults>((resolve, reject) => {
      this.pendingRequests.set(id, (res: WorkerResponse) => {
        if (res.type === "analysis_done") {
          const raw = res.payload as Record<string, unknown>;

          if (raw.error) {
            reject(new Error(raw.error as string));
            return;
          }

          // Merge raw results into our standardized schema
          const results = createEmptyResults({
            sampleSize: (raw.meta as Record<string, number>)?.sampleSize ?? 0,
            itemCount: (raw.meta as Record<string, number>)?.itemCount ?? 0,
            dimensionCount: 1,
            analysisDurationMs: (raw.meta as Record<string, number>)?.analysisDurationMs ?? 0,
          });

          if (raw.reliability && typeof raw.reliability === "object") {
            const r = raw.reliability as Record<string, unknown>;
            if (!r.error) {
              results.reliability = {
                cronbachsAlpha: (r.cronbachsAlpha as number) ?? 0,
                standardizedAlpha: (r.standardizedAlpha as number) ?? 0,
                itemTotalCorrelation: (r.itemTotalCorrelation as Record<string, number>) ?? {},
                alphaIfItemDeleted: (r.alphaIfItemDeleted as Record<string, number>) ?? {},
              };
            }
          }

          if (raw.validity && typeof raw.validity === "object") {
            const v = raw.validity as Record<string, unknown>;
            if (!v.error) {
              results.validity = {
                kmo: (v.kmo as number) ?? 0,
                kmoPerItem: (v.kmoPerItem as Record<string, number>) ?? {},
                bartlettChiSquare: (v.bartlettChiSquare as number) ?? 0,
                bartlettDf: (v.bartlettDf as number) ?? 0,
                bartlettPValue: (v.bartlettPValue as number) ?? 0,
                correlationMatrix: (v.correlationMatrix as number[][]) ?? [],
                columnLabels: (v.columnLabels as string[]) ?? [],
              };
            }
          }

          if (raw.efa && typeof raw.efa === "object") {
            const e = raw.efa as Record<string, unknown>;
            if (!e.error) {
              results.efa = {
                eigenvalues: (e.eigenvalues as number[]) ?? [],
                loadings: (e.loadings as number[][]) ?? [],
                communalities: (e.communalities as number[]) ?? [],
                varianceExplained: (e.varianceExplained as number[]) ?? [],
                rotation: (e.rotation as "varimax" | "oblimin") ?? "varimax",
                suggestedFactors: (e.suggestedFactors as number) ?? 0,
                itemLabels: (e.itemLabels as string[]) ?? [],
              };
            }
          }

          if (raw.stability && typeof raw.stability === "object") {
            const s = raw.stability as Record<string, unknown>;
            if (!s.error) {
              results.stability = {
                bootstrapSamples: (s.bootstrapSamples as number) ?? 0,
                alphaCurve: (s.alphaCurve as { sampleSize: number; alpha: number }[]) ?? [],
                stabilityLevel: (s.stabilityLevel as "stable" | "moderate" | "unstable") ?? "unstable",
                recommendedSampleSize: (s.recommendedSampleSize as number) ?? 0,
                elbowPoint: (s.elbowPoint as number) ?? null,
              };
            }
          }

          results.recommendedMethod = (raw.recommendedMethod as string) ?? "";
          resolve(results);
        } else if (res.type === "analysis_error") {
          reject(new Error(res.payload as string));
        }
      });
    });

    this.worker.postMessage({
      id,
      type: "run_analysis",
      payload: {
        pythonCode: buildPythonCode(),
        data: params.data,
        itemLabels: params.itemLabels,
        rotation: params.rotation ?? "varimax",
        nBootstrap: params.nBootstrap ?? 200,
      },
    });

    return promise;
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.loadPromise = null;
  }
}
