"use client";

import { useRef, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { compressResults } from "@/lib/ai/compressor";
import { validateResults } from "@/lib/stats/validation-engine";
import { sanitizeForStorage } from "@/lib/stats/sanitize";
import type { AnalysisResults, AnalysisStage } from "@/types";

type EngineStatus = "unloaded" | "loading" | "ready" | "error";

interface PyodideAPI {
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (names: string[]) => Promise<void>;
}

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js";

const STAGE_MAP: Record<string, AnalysisStage> = {
  reliability: "reliability",
  validity: "validity",
  efa: "efa",
  stability: "stability",
};

const STAGE_LABELS: Record<string, string> = {
  reliability: "计算 Cronbach's α",
  validity: "Bartlett 球形检验 + KMO",
  efa: "生成因子结构",
  stability: "Bootstrap 稳定性评估",
};

// Embedded Python — same as worker.ts, adapted for direct execution
const PYTHON_STEPS = [
  {
    id: "reliability",
    fn: `def run_reliability(data_json):
    import json, numpy as np
    data = np.array(json.loads(data_json), dtype=float)
    mask = ~np.isnan(data).any(axis=1)
    data = data[mask]
    n, k = data.shape
    item_vars = np.var(data, axis=0, ddof=1)
    total_var = np.var(np.sum(data, axis=1), ddof=1)
    alpha = float((k / (k - 1)) * (1 - np.sum(item_vars) / total_var)) if total_var > 0 and k > 1 else 0.0
    alpha = max(0.0, min(1.0, alpha))
    corr = np.corrcoef(data.T)
    mean_r = (np.sum(corr) - k) / (k * (k - 1)) if k > 1 else 0
    std_alpha = float((k * mean_r) / (1 + (k - 1) * mean_r)) if k > 1 else 0.0
    item_total = {}
    alpha_if_del = {}
    for i in range(k):
        total_without_i = np.sum(np.delete(data, i, axis=1), axis=1)
        r = np.corrcoef(data[:, i], total_without_i)[0, 1]
        item_total[str(i)] = float(r) if not np.isnan(r) else 0.0
        reduced = np.delete(data, i, axis=1)
        kr = reduced.shape[1]
        if kr >= 2:
            iv = np.var(reduced, axis=0, ddof=1)
            tv = np.var(np.sum(reduced, axis=1), ddof=1)
            aid = float((kr / (kr - 1)) * (1 - np.sum(iv) / tv)) if tv > 0 else None
        else:
            aid = None
        alpha_if_del[str(i)] = aid
    return json.dumps({"cronbachsAlpha": alpha, "standardizedAlpha": std_alpha, "itemTotalCorrelation": item_total, "alphaIfItemDeleted": alpha_if_del, "nSamples": int(n), "nItems": int(k)})`,
  },
  {
    id: "validity",
    fn: `def run_validity(data_json):
    import json, numpy as np
    from scipy import linalg
    data = np.array(json.loads(data_json), dtype=float)
    mask = ~np.isnan(data).any(axis=1)
    data = data[mask]
    n, p = data.shape
    R = np.corrcoef(data.T)
    R = np.nan_to_num(R, nan=0.0)
    try:
        R_inv = linalg.inv(R)
        diag_sqrt = np.sqrt(np.diag(R_inv))
        A = R_inv / np.outer(diag_sqrt, diag_sqrt)
        r2_sum, partial2_sum = 0.0, 0.0
        kmo_per_item = {}
        for i in range(p):
            num_i, den_i = 0.0, 0.0
            for j in range(p):
                if i != j:
                    r2_sum += R[i,j]**2
                    partial2_sum += A[i,j]**2
                    num_i += R[i,j]**2
                    den_i += R[i,j]**2 + A[i,j]**2
            kmo_per_item[str(i)] = float(num_i / den_i) if den_i > 0 else 0.0
        kmo = float(r2_sum / (r2_sum + partial2_sum)) if (r2_sum + partial2_sum) > 0 else 0.0
    except Exception:
        kmo = 0.0
        kmo_per_item = {}
    det_R = linalg.det(R) if linalg.det(R) > 0 else 1e-10
    chi2 = float(-(n - 1 - (2*p + 5)/6) * np.log(max(det_R, 1e-10)))
    df = int(p * (p - 1) / 2)
    from scipy.stats import chi2 as chi2_dist
    pval = float(1 - chi2_dist.cdf(max(chi2, 0), df))
    return json.dumps({"kmo": kmo, "kmoPerItem": kmo_per_item, "bartlettChiSquare": chi2, "bartlettDf": df, "bartlettPValue": pval, "correlationMatrix": R.tolist()})`,
  },
  {
    id: "efa",
    fn: `def run_efa(data_json):
    import json, numpy as np
    from scipy import linalg
    data = np.array(json.loads(data_json), dtype=float)
    mask = ~np.isnan(data).any(axis=1)
    data = data[mask]
    n, p = data.shape
    R = np.corrcoef(data.T)
    R = np.nan_to_num(R, nan=0.0)
    eigenvalues, eigenvectors = linalg.eigh(R)
    idx = np.argsort(eigenvalues)[::-1]
    eigenvalues = eigenvalues[idx].tolist()
    eigenvectors = eigenvectors[:, idx]
    n_factors = max(1, min(int(np.sum(np.array(eigenvalues) > 1.0)), p // 2))
    loadings = eigenvectors[:, :n_factors] * np.sqrt(np.array(eigenvalues[:n_factors]))
    if n_factors > 1:
        L = np.array(loadings, dtype=float)
        ni, nf = L.shape
        for _ in range(50):
            h2 = np.sum(L**2, axis=1, keepdims=True)
            U = L / np.sqrt(np.maximum(h2, 1e-10))
            V = L**3 - L * np.sum(L**2, axis=1, keepdims=True) / ni
            M = L.T @ V
            U_svd, _, Vt_svd = linalg.svd(M)
            T = U_svd @ Vt_svd
            if np.max(np.abs(T - np.eye(nf))) < 1e-6:
                break
            L = L @ T
        loadings = L.tolist()
    else:
        loadings = loadings.tolist()
    communalities = [float(np.sum(np.array(row)**2)) for row in loadings]
    ss = np.sum(np.array(loadings)**2, axis=0)
    variance_explained = (ss / p).tolist()
    # McDonald's Omega from first factor loadings
    first_loadings = np.array(loadings)[:, 0]
    sum_load = float(np.sum(first_loadings))
    sum_unique = float(np.sum(1.0 - first_loadings**2))
    omega = (sum_load**2) / (sum_load**2 + sum_unique) if (sum_load**2 + sum_unique) > 0 else 0.0
    return json.dumps({"eigenvalues": eigenvalues, "loadings": loadings, "communalities": communalities, "varianceExplained": variance_explained, "suggestedFactors": n_factors, "omega": max(0.0, min(1.0, omega))})`,
  },
  {
    id: "stability",
    fn: `def run_stability(data_json, n_bootstrap=200):
    import json, numpy as np
    data = np.array(json.loads(data_json), dtype=float)
    mask = ~np.isnan(data).any(axis=1)
    data = data[mask]
    n, p = data.shape
    if n < 20:
        return json.dumps({"bootstrapSamples": 0, "alphaCurve": [], "stabilityLevel": "unstable", "recommendedSampleSize": n, "elbowPoint": None})
    sizes = []
    start = max(10, int(n * 0.1))
    step = max(1, (n - start) // 12)
    for s in range(start, n + 1, step):
        sizes.append(s)
    if sizes[-1] != n:
        sizes.append(n)
    alpha_curve = []
    for size in sizes:
        alphas = []
        for _ in range(min(n_bootstrap, 200)):
            idx = np.random.choice(n, size=size, replace=True)
            sample = data[idx]
            k = sample.shape[1]
            iv = np.var(sample, axis=0, ddof=1)
            tv = np.var(np.sum(sample, axis=1), ddof=1)
            if tv > 0 and k > 1:
                a = (k / (k - 1)) * (1 - np.sum(iv) / tv)
                alphas.append(max(0.0, min(1.0, a)))
        if alphas:
            alpha_curve.append({"sampleSize": int(size), "alpha": float(np.mean(alphas))})
    if len(alpha_curve) >= 3:
        tail = [p["alpha"] for p in alpha_curve[-3:]]
        spread = max(tail) - min(tail)
        level = "stable" if spread < 0.02 else ("moderate" if spread < 0.05 else "unstable")
    else:
        level = "unstable"
    elbow = None
    if len(alpha_curve) >= 4:
        for i in range(2, len(alpha_curve)):
            if alpha_curve[i]["alpha"] - alpha_curve[i-2]["alpha"] < 0.005:
                elbow = alpha_curve[i]["sampleSize"]
                break
    rec = elbow if elbow is not None else n
    return json.dumps({"bootstrapSamples": int(n_bootstrap), "alphaCurve": alpha_curve, "stabilityLevel": level, "recommendedSampleSize": int(max(30, rec)), "elbowPoint": elbow})`,
  },
];

function remapKeys<T>(numericMap: Record<string, T>, labels: string[]): Record<string, T> {
  const result = {} as Record<string, T>;
  for (const [key, value] of Object.entries(numericMap)) {
    const idx = parseInt(key);
    result[labels[idx] ?? key] = value;
  }
  return result;
}

function filterNulls(map: Record<string, number | null>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v !== null) result[k] = v;
  }
  return result;
}

export function usePyodide() {
  const pyRef = useRef<PyodideAPI | null>(null);
  const [status, setStatus] = useState<EngineStatus>("unloaded");
  const [loadingMessage, setLoadingMessage] = useState("");

  const initEngine = useCallback(async () => {
    if (pyRef.current) return pyRef.current;
    setStatus("loading");
    setLoadingMessage("加载统计引擎...");

    try {
      // Load Pyodide via script tag
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = PYODIDE_CDN;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide from CDN"));
        document.head.appendChild(script);
      });

      const loadPyodide = (window as unknown as Record<string, unknown>).loadPyodide as
        (opts: { indexURL: string }) => Promise<PyodideAPI>;

      if (!loadPyodide) throw new Error("Pyodide not available");

      setLoadingMessage("安装统计包...");
      const py = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/",
      });

      await py.loadPackage(["numpy", "scipy"]);
      pyRef.current = py;
      setStatus("ready");
      return py;
    } catch (err) {
      setStatus("error");
      throw err;
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    const state = useAppStore.getState();
    const { rawData, likertColumns } = state;
    if (!rawData) throw new Error("No data to analyze");

    let py = pyRef.current;
    if (!py) {
      py = await initEngine();
    }

    const data: number[][] = [];
    for (const row of rawData.rows) {
      const vec: number[] = [];
      for (const col of likertColumns) {
        const v = Number(row[col]);
        vec.push(isNaN(v) ? NaN : v);
      }
      data.push(vec);
    }

    const dataJson = JSON.stringify(data);

    // Store data as a Python global to avoid string interpolation issues
    await py.runPythonAsync("import json");
    await py.runPythonAsync(`__data_json__ = '''${dataJson}'''`);

    const results = {} as Record<string, Record<string, unknown>>;

    // Run each step sequentially with progress
    for (const step of PYTHON_STEPS) {
      const stageLabel = STAGE_LABELS[step.id] ?? step.id;
      useAppStore.getState().setAnalysisStage(STAGE_MAP[step.id] ?? "idle");
      setLoadingMessage(stageLabel);

      // Register the function
      await py.runPythonAsync(step.fn);

      // Execute
      const callCode = step.id === "stability"
        ? `run_stability(__data_json__, 200)`
        : `run_${step.id}(__data_json__)`;
      const resultJson = await py.runPythonAsync(callCode) as string;
      const parsed = JSON.parse(resultJson as string);
      if ((parsed as Record<string, unknown>).error) {
        throw new Error(`Step ${step.id}: ${(parsed as Record<string, unknown>).error}`);
      }
      results[step.id] = parsed as Record<string, unknown>;
    }

    // Build AnalysisResults from step results
    const finalResults = sanitizeForStorage(buildResults(results, likertColumns));
    useAppStore.getState().setResults(finalResults);

    const validation = validateResults(finalResults);
    useAppStore.getState().setValidationReport(validation);

    const compressed = compressResults(finalResults, state.researchGoal);
    return { results: finalResults, compressed };
  }, [initEngine]);

  return {
    status,
    loadingMessage,
    initEngine,
    runAnalysis,
  };
}

function buildResults(raw: Record<string, Record<string, unknown>>, labels: string[]): AnalysisResults {
  const results: AnalysisResults = {
    meta: { schemaVersion: "1.0.0", sampleSize: 0, itemCount: labels.length, dimensionCount: 1, timestamp: Date.now(), analysisDurationMs: 0 },
    reliability: { cronbachsAlpha: 0, standardizedAlpha: 0, mcdonaldsOmega: 0, itemTotalCorrelation: {}, alphaIfItemDeleted: {} },
    validity: { kmo: 0, kmoPerItem: {}, bartlettChiSquare: 0, bartlettDf: 0, bartlettPValue: 0, correlationMatrix: [], columnLabels: labels },
    efa: { eigenvalues: [], loadings: [], communalities: [], varianceExplained: [], rotation: "varimax", suggestedFactors: 0, itemLabels: labels },
    stability: { bootstrapSamples: 0, alphaCurve: [], stabilityLevel: "unstable", recommendedSampleSize: 0, elbowPoint: null },
    recommendedMethod: "",
  };

  const r = raw.reliability;
  if (r && !r.error) {
    results.reliability = {
      cronbachsAlpha: (r.cronbachsAlpha as number) ?? 0,
      standardizedAlpha: (r.standardizedAlpha as number) ?? 0,
      mcdonaldsOmega: 0, // filled later from EFA omega
      itemTotalCorrelation: remapKeys(r.itemTotalCorrelation as Record<string, number> ?? {}, labels),
      alphaIfItemDeleted: remapKeys(filterNulls(r.alphaIfItemDeleted as Record<string, number | null> ?? {}), labels),
    };
    results.meta.sampleSize = (r.nSamples as number) ?? 0;
    results.meta.itemCount = (r.nItems as number) ?? 0;
  }

  const v = raw.validity;
  if (v && !v.error) {
    results.validity = {
      kmo: (v.kmo as number) ?? 0,
      kmoPerItem: remapKeys(v.kmoPerItem as Record<string, number> ?? {}, labels),
      bartlettChiSquare: (v.bartlettChiSquare as number) ?? 0,
      bartlettDf: (v.bartlettDf as number) ?? 0,
      bartlettPValue: (v.bartlettPValue as number) ?? 0,
      correlationMatrix: (v.correlationMatrix as number[][]) ?? [],
      columnLabels: labels,
    };
  }

  const e = raw.efa;
  if (e && !e.error) {
    results.efa = {
      eigenvalues: (e.eigenvalues as number[]) ?? [],
      loadings: (e.loadings as number[][]) ?? [],
      communalities: (e.communalities as number[]) ?? [],
      varianceExplained: (e.varianceExplained as number[]) ?? [],
      rotation: "varimax",
      suggestedFactors: (e.suggestedFactors as number) ?? 0,
      itemLabels: labels,
    };
    if ((e as Record<string, unknown>).omega !== undefined) {
      results.reliability.mcdonaldsOmega = (e as Record<string, unknown>).omega as number;
    }
  }

  const s = raw.stability;
  if (s && !s.error) {
    results.stability = {
      bootstrapSamples: (s.bootstrapSamples as number) ?? 0,
      alphaCurve: (s.alphaCurve as { sampleSize: number; alpha: number }[]) ?? [],
      stabilityLevel: (s.stabilityLevel as "stable" | "moderate" | "unstable") ?? "unstable",
      recommendedSampleSize: (s.recommendedSampleSize as number) ?? 0,
      elbowPoint: (s.elbowPoint as number) ?? null,
    };
  }

  return results;
}
