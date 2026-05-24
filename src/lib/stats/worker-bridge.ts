// ============================================================
// Main Thread ↔ Pyodide Worker Bridge
// Per-step execution with progress: elapsed + estimated remaining
// ============================================================

import type { AnalysisResults } from "@/types";
import { createEmptyResults } from "../schema";

export interface StepProgress {
  stage: string;
  message: string;
  elapsedMs: number;
  estimatedRemainingMs: number | null;
}

export type StepProgressCallback = (progress: StepProgress) => void;

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

export class StatsWorkerBridge {
  private worker: Worker | null = null;
  private ready = false;
  private pendingRequests = new Map<string, (res: WorkerResponse) => void>();
  private loadPromise: Promise<void> | null = null;
  private onStepProgress: StepProgressCallback | null = null;

  constructor(onStepProgress?: StepProgressCallback) {
    this.onStepProgress = onStepProgress ?? null;
  }

  async initialize(): Promise<void> {
    if (this.ready) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(new URL("./worker.ts", import.meta.url));

        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const msg = e.data;

          // Forward step progress to callback
          if (msg.type === "progress" && this.onStepProgress) {
            const p = msg.payload as { stage: string; message: string; elapsedMs: number; estimatedTotalMs: number | null };
            this.onStepProgress({
              stage: p.stage,
              message: p.message,
              elapsedMs: p.elapsedMs,
              estimatedRemainingMs: p.estimatedTotalMs,
            });
          }

          if (msg.type === "init_done") {
            this.ready = true;
            resolve();
          }

          if (msg.type === "init_error") {
            reject(new Error(msg.payload as string));
          }

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

    const worker = this.worker;
    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, (res: WorkerResponse) => {
        if (res.type === "analysis_done") {
          const raw = res.payload as Record<string, Record<string, unknown>>;
          const results = createEmptyResults({
            sampleSize: 0,
            itemCount: params.itemLabels.length,
            dimensionCount: 1,
            analysisDurationMs: 0,
          });

          // Merge reliability
          if (raw.reliability && !raw.reliability.error) {
            const r = raw.reliability;
            results.reliability = {
              cronbachsAlpha: (r.cronbachsAlpha as number) ?? 0,
              standardizedAlpha: (r.standardizedAlpha as number) ?? 0,
              itemTotalCorrelation: remapKeys(r.itemTotalCorrelation as Record<string, number> ?? {}, params.itemLabels),
              alphaIfItemDeleted: remapKeys(filterNulls(r.alphaIfItemDeleted as Record<string, number | null> ?? {}), params.itemLabels),
            };
            results.meta.sampleSize = (r.nSamples as number) ?? 0;
            results.meta.itemCount = (r.nItems as number) ?? 0;
          }

          // Merge validity
          if (raw.validity && !raw.validity.error) {
            const v = raw.validity;
            results.validity = {
              kmo: (v.kmo as number) ?? 0,
              kmoPerItem: remapKeys(v.kmoPerItem as Record<string, number> ?? {}, params.itemLabels),
              bartlettChiSquare: (v.bartlettChiSquare as number) ?? 0,
              bartlettDf: (v.bartlettDf as number) ?? 0,
              bartlettPValue: (v.bartlettPValue as number) ?? 0,
              correlationMatrix: (v.correlationMatrix as number[][]) ?? [],
              columnLabels: params.itemLabels,
            };
          }

          // Merge EFA
          if (raw.efa && !raw.efa.error) {
            const e = raw.efa;
            results.efa = {
              eigenvalues: (e.eigenvalues as number[]) ?? [],
              loadings: (e.loadings as number[][]) ?? [],
              communalities: (e.communalities as number[]) ?? [],
              varianceExplained: (e.varianceExplained as number[]) ?? [],
              rotation: (params.rotation as "varimax" | "oblimin") ?? "varimax",
              suggestedFactors: (e.suggestedFactors as number) ?? 0,
              itemLabels: params.itemLabels,
            };
          }

          // Merge stability
          if (raw.stability && !raw.stability.error) {
            const s = raw.stability;
            results.stability = {
              bootstrapSamples: (s.bootstrapSamples as number) ?? 0,
              alphaCurve: (s.alphaCurve as { sampleSize: number; alpha: number }[]) ?? [],
              stabilityLevel: (s.stabilityLevel as "stable" | "moderate" | "unstable") ?? "unstable",
              recommendedSampleSize: (s.recommendedSampleSize as number) ?? 0,
              elbowPoint: (s.elbowPoint as number) ?? null,
            };
          }

          resolve(results);
        } else if (res.type === "analysis_error") {
          reject(new Error(res.payload as string));
        }
      });

      worker!.postMessage({
        id,
        type: "run_analysis",
        payload: {
          data: params.data,
          itemLabels: params.itemLabels,
          rotation: params.rotation ?? "varimax",
          nBootstrap: params.nBootstrap ?? 200,
        },
      });
    });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.loadPromise = null;
  }
}

function filterNulls(map: Record<string, number | null>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v !== null) result[k] = v;
  }
  return result;
}

function remapKeys<T>(numericMap: Record<string, T>, labels: string[]): Record<string, T> {
  const result: Record<string, T> = {} as Record<string, T>;
  for (const [key, value] of Object.entries(numericMap)) {
    const idx = parseInt(key);
    const label = labels[idx] ?? key;
    result[label] = value;
  }
  return result;
}
