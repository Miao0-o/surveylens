// ============================================================
// Pyodide Web Worker — Per-Step Execution
// Runs Python analysis stages individually, reporting progress
// after each step for accurate stage UI + timing
// ============================================================

declare function importScripts(...urls: string[]): void;

interface WorkerMessage {
  id: string;
  type: "init" | "run_analysis" | "run_step";
  payload?: unknown;
}

interface WorkerResponse {
  id?: string;
  type: "init_done" | "init_error" | "step_done" | "step_error" | "analysis_done" | "analysis_error" | "progress";
  payload?: unknown;
}

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (names: string[]) => Promise<void>;
}

let pyodide: PyodideInstance | null = null;
let isReady = false;
let stepTimings: Record<string, number> = {};

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js";

async function initPyodide(): Promise<void> {
  try {
    importScripts(PYODIDE_URL);
    const loadPyodide = (self as unknown as Record<string, unknown>).loadPyodide as
      | ((opts: { indexURL: string }) => Promise<PyodideInstance>)
      | undefined;

    if (!loadPyodide) {
      throw new Error("Pyodide failed to initialize: loadPyodide not found");
    }

    const startLoad = performance.now();
    postMessage({ type: "progress", payload: { stage: "loading_packages", message: "加载统计引擎...", elapsedMs: 0, estimatedTotalMs: null } });

    const py = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/" });
    pyodide = py;
    const loadTime = Math.round(performance.now() - startLoad);

    // Load numpy + scipy
    const startPkg = performance.now();
    await py.loadPackage(["numpy", "scipy"]);
    const pkgTime = Math.round(performance.now() - startPkg);

    stepTimings["pyodide_load"] = loadTime;
    stepTimings["package_load"] = pkgTime;

    isReady = true;
    postMessage({ type: "init_done", payload: { timings: stepTimings } });
  } catch (err) {
    postMessage({ type: "init_error", payload: err instanceof Error ? err.message : String(err) });
  }
}

// Individual Python step modules — each is a self-contained function
const STEPS: { id: string; label: string; fn: string }[] = [
  {
    id: "reliability",
    label: "计算 Cronbach's α",
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
    # Standardized alpha
    corr = np.corrcoef(data.T)
    mean_r = (np.sum(corr) - k) / (k * (k - 1)) if k > 1 else 0
    std_alpha = float((k * mean_r) / (1 + (k - 1) * mean_r)) if k > 1 else 0.0
    # Item-total correlations
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
    label: "Bartlett 球形检验 + KMO",
    fn: `def run_validity(data_json):
    import json, numpy as np
    from scipy import linalg
    data = np.array(json.loads(data_json), dtype=float)
    mask = ~np.isnan(data).any(axis=1)
    data = data[mask]
    n, p = data.shape
    R = np.corrcoef(data.T)
    R = np.nan_to_num(R, nan=0.0)
    # KMO
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
    # Bartlett
    det_R = linalg.det(R) if linalg.det(R) > 0 else 1e-10
    chi2 = float(-(n - 1 - (2*p + 5)/6) * np.log(max(det_R, 1e-10)))
    df = int(p * (p - 1) / 2)
    from scipy.stats import chi2 as chi2_dist
    pval = float(1 - chi2_dist.cdf(max(chi2, 0), df))
    return json.dumps({"kmo": kmo, "kmoPerItem": kmo_per_item, "bartlettChiSquare": chi2, "bartlettDf": df, "bartlettPValue": pval, "correlationMatrix": R.tolist()})`,
  },
  {
    id: "efa",
    label: "生成因子结构",
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
    # Varimax rotation
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
    return json.dumps({"eigenvalues": eigenvalues, "loadings": loadings, "communalities": communalities, "varianceExplained": variance_explained, "suggestedFactors": n_factors})`,
  },
  {
    id: "stability",
    label: "Bootstrap 稳定性评估",
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

async function runAnalysisSteps(id: string, payload: {
  data: number[][];
  itemLabels: string[];
  rotation: string;
  nBootstrap: number;
}): Promise<void> {
  const py = pyodide;
  if (!isReady || !py) {
    postMessage({ id, type: "analysis_error", payload: "Pyodide not initialized" });
    return;
  }

  const dataJson = JSON.stringify(payload.data);
  const timings: Record<string, number> = {};
  const results: Record<string, unknown> = {};
  let totalElapsed = 0;

  try {
    for (const step of STEPS) {
      const startStep = performance.now();

      postMessage({
        id,
        type: "progress",
        payload: {
          stage: step.id,
          message: step.label,
          elapsedMs: totalElapsed,
          estimatedTotalMs: estimateTotal(step.id, timings),
        },
      });

      // Run the step function
      await py.runPythonAsync(step.fn);

      let stepResultJson: string;
      if (step.id === "stability") {
        stepResultJson = await py.runPythonAsync(
          `run_stability('''${dataJson}''', ${payload.nBootstrap})`
        ) as string;
      } else {
        stepResultJson = await py.runPythonAsync(
          `run_${step.id}('''${dataJson}''')`
        ) as string;
      }

      const stepResult = JSON.parse(stepResultJson);
      results[step.id] = stepResult;

      const elapsed = Math.round(performance.now() - startStep);
      timings[step.id] = elapsed;
      totalElapsed += elapsed;

      postMessage({
        id,
        type: "step_done",
        payload: {
          stage: step.id,
          result: stepResult,
          elapsedMs: elapsed,
          totalElapsedMs: totalElapsed,
        },
      });
    }

    // Add recommendation
    results["recommendedMethod"] = "";
    results["meta"] = {};

    postMessage({ id, type: "analysis_done", payload: results });
  } catch (err) {
    postMessage({
      id,
      type: "analysis_error",
      payload: err instanceof Error ? err.message : String(err),
    });
  }
}

function estimateTotal(currentStepId: string, timings: Record<string, number>): number | null {
  // If we have at least one completed step, estimate based on known steps
  const completedSteps = Object.keys(timings);
  if (completedSteps.length === 0) return null;

  const avgStepMs = Object.values(timings).reduce((a, b) => a + b, 0) / completedSteps.length;
  const remainingSteps = STEPS.length - STEPS.findIndex(s => s.id === currentStepId) - 1 + 1; // +1 for current
  return Math.round(avgStepMs * remainingSteps);
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case "init":
      initPyodide();
      break;
    case "run_analysis":
      runAnalysisSteps(msg.id, msg.payload as Parameters<typeof runAnalysisSteps>[1]);
      break;
  }
};
