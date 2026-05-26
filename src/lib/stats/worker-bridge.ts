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
            const itemCount = (r.nItems as number) ?? 0;
            const alpha = (r.cronbachsAlpha as number) ?? 0;
            results.reliability = {
              cronbachsAlpha: alpha, standardizedAlpha: (r.standardizedAlpha as number) ?? 0,
              mcdonaldsOmega: 0,
              itemTotalCorrelation: remapKeys(r.itemTotalCorrelation as Record<string, number> ?? {}, params.itemLabels),
              alphaIfItemDeleted: remapKeys(filterNulls(r.alphaIfItemDeleted as Record<string, number | null> ?? {}), params.itemLabels),
              _meta: itemCount >= 2
                ? { value: alpha, status: "ok" as const, reason: `Cronbach's α computed on ${itemCount} items`, confidence: 1.0 }
                : { value: null, status: "not_applicable" as const, reason: "No Likert-scale items detected", confidence: 1.0 },
            };
            results.meta.sampleSize = (r.nSamples as number) ?? 0;
            results.meta.itemCount = itemCount;
          }

          // Merge validity
          if (raw.validity && !raw.validity.error) {
            const v = raw.validity;
            const kmoVal = (v.kmo as number) ?? 0;
            results.validity = {
              kmo: kmoVal, kmoPerItem: remapKeys(v.kmoPerItem as Record<string, number> ?? {}, params.itemLabels),
              bartlettChiSquare: (v.bartlettChiSquare as number) ?? 0, bartlettDf: (v.bartlettDf as number) ?? 0,
              bartlettPValue: (v.bartlettPValue as number) ?? 0, correlationMatrix: (v.correlationMatrix as number[][]) ?? [],
              columnLabels: params.itemLabels,
              _meta: kmoVal > 0
                ? { value: kmoVal, status: "ok" as const, reason: `KMO computed from ${params.itemLabels.length} items`, confidence: 1.0 }
                : { value: null, status: "insufficient_data" as const, reason: "Insufficient inter-item correlation", confidence: 0.7 },
            };
          }

          // Merge EFA
          if (raw.efa && !raw.efa.error) {
            const e = raw.efa;
            const rawMeta = (e as Record<string, unknown>).efa_metadata as Record<string, unknown> | undefined;
            results.efa = {
              eigenvalues: (e.eigenvalues as number[]) ?? [],
              loadings: (e.loadings as number[][]) ?? [],
              communalities: (e.communalities as number[]) ?? [],
              varianceExplained: (e.varianceExplained as number[]) ?? [],
              rotation: (params.rotation as "varimax" | "oblimin") ?? "varimax",
              suggestedFactors: (e.suggestedFactors as number) ?? 0,
              itemLabels: params.itemLabels,
              metadata: rawMeta ? {
                raw_factor_estimation: {
                  kaiser_n: (rawMeta.raw_factor_estimation as Record<string, unknown>)?.kaiser_n as number ?? 0,
                  scree_suggestion: (rawMeta.raw_factor_estimation as Record<string, unknown>)?.scree_suggestion as number | null ?? null,
                  parallel_analysis_n: null,
                },
                factor_stability: {
                  risk_level: ((rawMeta.factor_stability as Record<string, unknown>)?.risk_level as "low" | "moderate" | "high") ?? "low",
                  too_many_factors: (rawMeta.factor_stability as Record<string, unknown>)?.too_many_factors as boolean ?? false,
                  recommended_range: ((rawMeta.factor_stability as Record<string, unknown>)?.recommended_range as [number, number]) ?? [1, 3],
                  warnings: ((rawMeta.factor_stability as Record<string, unknown>)?.warnings as string[]) ?? [],
                },
                product_decision: {
                  display_factor_n: (rawMeta.product_decision as Record<string, unknown>)?.display_factor_n as number ?? 0,
                  decision_rule: ((rawMeta.product_decision as Record<string, unknown>)?.decision_rule as string) ?? "",
                  type: "presentation_constraint",
                },
              } : {
                raw_factor_estimation: { kaiser_n: 0, scree_suggestion: null, parallel_analysis_n: null },
                factor_stability: { risk_level: "low" as const, too_many_factors: false, recommended_range: [1, 3] as [number, number], warnings: [] },
                product_decision: { display_factor_n: 0, decision_rule: "", type: "presentation_constraint" as const },
              },
              _meta: (e.suggestedFactors as number ?? 0) > 0
                ? { value: (e.suggestedFactors as number) ?? 0, status: "ok" as const, reason: `EFA extracted factors from ${params.itemLabels.length} items`, confidence: 1.0 }
                : { value: null, status: "not_applicable" as const, reason: "Insufficient inter-item correlation for factor extraction", confidence: 1.0 },
            };
            if ((e as Record<string, unknown>).omega !== undefined) {
              results.reliability.mcdonaldsOmega = (e as Record<string, unknown>).omega as number;
            }
          }

          // Merge stability
          if (raw.stability && !raw.stability.error) {
            const s = raw.stability;
            const bootN = (s.bootstrapSamples as number) ?? 0;
            results.stability = {
              bootstrapSamples: bootN,
              alphaCurve: (s.alphaCurve as { sampleSize: number; alpha: number }[]) ?? [],
              stabilityLevel: (s.stabilityLevel as "stable" | "moderate" | "unstable") ?? "unstable",
              recommendedSampleSize: (s.recommendedSampleSize as number) ?? 0,
              elbowPoint: (s.elbowPoint as number) ?? null,
              _meta: bootN > 0
                ? { value: (s.recommendedSampleSize as number) ?? 0, status: "ok" as const, reason: `Bootstrap assessed with ${bootN} samples`, confidence: 0.9 }
                : { value: null, status: "insufficient_data" as const, reason: "Sample too small for bootstrap", confidence: 0.7 },
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
