"use client";

import { useRef, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { compressResults } from "@/lib/ai/compressor";
import { validateResults } from "@/lib/stats/validation-engine";
import { sanitizeForStorage } from "@/lib/stats/sanitize";
import { extractLikertFromFreeze } from "@/lib/codebook/mapping-engine";
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
  descriptive: "descriptive",
  correlation: "correlation",
  stability: "stability",
};

const STAGE_LABELS: Record<string, string> = {
  reliability: "计算 Cronbach's α",
  validity: "Bartlett 球形检验 + KMO",
  efa: "生成因子结构",
  descriptive: "描述性统计",
  correlation: "相关性分析",
  stability: "Bootstrap 稳定性评估",
};

// Embedded Python — same as worker.ts, adapted for direct execution
const PYTHON_STEPS = [
  {
    id: "descriptive",
    label: "描述性统计",
    fn: `def run_descriptive(data_json):
    import json, numpy as np
    data = np.array(json.loads(data_json), dtype=float)
    results = []
    for i in range(data.shape[1]):
        col = data[:, i]; col = col[~np.isnan(col)]; n = len(col)
        if n < 3: results.append({"n": n, "mean": None, "sd": None, "skew": None, "kurtosis": None}); continue
        mean = float(np.mean(col)); sd = float(np.std(col, ddof=1))
        skew = float(((n * np.sum((col - mean)**3)) / ((n-1)*(n-2)*sd**3)) if sd > 0 and n > 2 else 0.0)
        kurt = float(((n*(n+1)*np.sum((col-mean)**4) - 3*np.sum((col-mean)**2)**2*(n-1)) / ((n-1)*(n-2)*(n-3)*sd**4)) if sd > 0 and n > 3 else 0.0)
        results.append({"n": int(n), "mean": round(mean,4), "sd": round(sd,4), "min": round(float(np.min(col)),4), "max": round(float(np.max(col)),4), "skew": round(skew,4), "kurtosis": round(kurt,4)})
    return json.dumps(results)`,
  },
  {
    id: "reliability",
    fn: `def run_reliability(data_json):
    import json, numpy as np
    data = np.array(json.loads(data_json), dtype=float)
    k = data.shape[1]
    if k < 2:
        return json.dumps({"cronbachsAlpha": 0.0, "standardizedAlpha": 0.0, "itemTotalCorrelation": {}, "alphaIfItemDeleted": {}, "nSamples": int(data.shape[0]), "nItems": int(k)})
    # Use nan-aware variance — each item's variance computed from its own valid values
    item_vars = np.array([np.nanvar(data[:, j], ddof=1) for j in range(k)])
    item_vars = np.nan_to_num(item_vars, nan=0.0)
    # Total score: sum across items, ignoring NaN (treat NaN as 0 contribution)
    row_sums = np.nansum(data, axis=1)
    total_var = np.var(row_sums, ddof=1) if len(row_sums) > 1 else 0.0
    alpha = float((k / (k - 1)) * (1 - np.sum(item_vars) / total_var)) if total_var > 0 else 0.0
    alpha = max(0.0, min(1.0, alpha))
    # Correlation: use only complete rows for corrcoef, fall back to nan-aware
    complete_mask = ~np.isnan(data).any(axis=1)
    if np.sum(complete_mask) >= 3:
        complete_data = data[complete_mask]
        corr = np.corrcoef(complete_data.T)
    else:
        # Fallback: pairwise correlation from valid pairs
        corr = np.eye(k)
        for i in range(k):
            for j in range(i+1, k):
                valid = ~np.isnan(data[:, i]) & ~np.isnan(data[:, j])
                if np.sum(valid) >= 3:
                    r = np.corrcoef(data[valid, i], data[valid, j])[0, 1]
                    corr[i, j] = r; corr[j, i] = r
    mean_r = (np.sum(corr) - k) / (k * (k - 1)) if k > 1 else 0
    std_alpha = float((k * mean_r) / (1 + (k - 1) * mean_r)) if k > 1 and mean_r > -1/(k-1) else 0.0
    # Item-total: use valid pairs between item and total-minus-item
    item_total = {}
    alpha_if_del = {}
    for i in range(k):
        total_others = np.nansum(np.delete(data, i, axis=1), axis=1)
        valid = ~np.isnan(data[:, i]) & ~np.isnan(total_others)
        if np.sum(valid) >= 3:
            r = np.corrcoef(data[valid, i], total_others[valid])[0, 1]
            item_total[str(i)] = float(r) if not np.isnan(r) else 0.0
        else:
            item_total[str(i)] = 0.0
        # Alpha-if-deleted using valid rows for the reduced set
        reduced = np.delete(data, i, axis=1)
        kr = reduced.shape[1]
        if kr >= 2:
            cm = ~np.isnan(reduced).any(axis=1)
            if np.sum(cm) >= 3:
                rd = reduced[cm]
                iv = np.var(rd, axis=0, ddof=1)
                tv = np.var(np.sum(rd, axis=1), ddof=1)
                aid = float((kr / (kr - 1)) * (1 - np.sum(iv) / tv)) if tv > 0 else None
            else:
                aid = None
        else:
            aid = None
        alpha_if_del[str(i)] = aid
    n_complete = int(np.sum(complete_mask))
    return json.dumps({"cronbachsAlpha": alpha, "standardizedAlpha": std_alpha, "itemTotalCorrelation": item_total, "alphaIfItemDeleted": alpha_if_del, "nSamples": int(data.shape[0]), "nComplete": n_complete, "nItems": int(k)})`,

  },
  {
    id: "reliability_per_dim",
    label: "维度信度",
    fn: `def run_reliability_per_dim(data_json, dim_spec_json):
    import json, numpy as np
    data = np.array(json.loads(data_json), dtype=float)
    dim_spec = json.loads(dim_spec_json)  # [{"name":"D1","indices":[0,1,2]}, ...]
    results = []
    for dim in dim_spec:
        indices = dim["indices"]
        name = dim["name"]
        sub = data[:, indices]
        k = sub.shape[1]
        if k < 2:
            results.append({"name": name, "items": indices, "cronbachsAlpha": 0.0, "standardizedAlpha": 0.0, "itemTotalCorrelation": {}, "alphaIfItemDeleted": {}})
            continue
        cm = ~np.isnan(sub).any(axis=1)
        if np.sum(cm) >= 3:
            sub = sub[cm]
        n, k2 = sub.shape[0], sub.shape[1]
        if k2 < 2 or n < 3:
            results.append({"name": name, "items": indices, "cronbachsAlpha": 0.0, "standardizedAlpha": 0.0, "itemTotalCorrelation": {}, "alphaIfItemDeleted": {}})
            continue
        iv = np.var(sub, axis=0, ddof=1)
        tv = np.var(np.sum(sub, axis=1), ddof=1)
        alpha = float((k2/(k2-1))*(1-np.sum(iv)/tv)) if tv > 0 else 0.0
        alpha = max(0.0, min(1.0, alpha))
        # Standardized alpha
        corr = np.corrcoef(sub.T)
        mean_r = (np.sum(corr)-k2)/(k2*(k2-1)) if k2 > 1 else 0
        std_alpha = float((k2*mean_r)/(1+(k2-1)*mean_r)) if k2 > 1 and mean_r > -1/(k2-1) else 0.0
        item_total = {}
        alpha_if_del = {}
        for i in range(k2):
            total_others = np.nansum(np.delete(sub, i, axis=1), axis=1)
            valid = ~np.isnan(sub[:, i]) & ~np.isnan(total_others)
            if np.sum(valid) >= 3:
                r = np.corrcoef(sub[valid, i], total_others[valid])[0, 1]
                item_total[str(indices[i])] = float(r) if not np.isnan(r) else 0.0
            else:
                item_total[str(indices[i])] = 0.0
            reduced = np.delete(sub, i, axis=1)
            kr = reduced.shape[1]
            if kr >= 2:
                rcm = ~np.isnan(reduced).any(axis=1)
                if np.sum(rcm) >= 3:
                    rd = reduced[rcm]
                    riv = np.var(rd, axis=0, ddof=1)
                    rtv = np.var(np.sum(rd, axis=1), ddof=1)
                    aid = float((kr/(kr-1))*(1-np.sum(riv)/rtv)) if rtv > 0 else None
                else:
                    aid = None
            else:
                aid = None
            alpha_if_del[str(indices[i])] = aid
        results.append({"name": name, "items": indices, "cronbachsAlpha": alpha, "standardizedAlpha": std_alpha, "itemTotalCorrelation": item_total, "alphaIfItemDeleted": alpha_if_del})
    return json.dumps(results)`,
  },
  {
    id: "validity",
    fn: `def run_validity(data_json):
    import json, numpy as np
    from scipy import linalg
    data = np.array(json.loads(data_json), dtype=float)
    p = data.shape[1]
    # Use pairwise complete observations for correlation
    R = np.eye(p)
    for i in range(p):
        for j in range(i+1, p):
            valid = ~np.isnan(data[:, i]) & ~np.isnan(data[:, j])
            if np.sum(valid) >= 3:
                R[i, j] = np.corrcoef(data[valid, i], data[valid, j])[0, 1]
                R[j, i] = R[i, j]
    R = np.nan_to_num(R, nan=0.0)
    n_complete = int(np.sum(~np.isnan(data).any(axis=1)))
    n = max(n_complete, data.shape[0])
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
    p = data.shape[1]
    # Pairwise correlation, NaN-resilient
    R = np.eye(p)
    for i in range(p):
        for j in range(i+1, p):
            valid = ~np.isnan(data[:, i]) & ~np.isnan(data[:, j])
            if np.sum(valid) >= 3:
                R[i, j] = np.corrcoef(data[valid, i], data[valid, j])[0, 1]
                R[j, i] = R[i, j]
    R = np.nan_to_num(R, nan=0.0)
    # Use complete rows only for eigenvalues/loadings from the pairwise R
    cm = ~np.isnan(data).any(axis=1)
    complete_n = int(np.sum(cm))
    if complete_n >= 3:
        data = data[cm]
    n, p = data.shape[0], data.shape[1]
    eigenvalues, eigenvectors = linalg.eigh(R)
    idx = np.argsort(eigenvalues)[::-1]
    eigenvalues = eigenvalues[idx].tolist()
    eigenvectors = eigenvectors[:, idx]
    # === LAYER 1: Statistical Extraction ===
    ev = np.array(eigenvalues)
    kaiser_n = int(np.sum(ev > 1.0))
    # Scree elbow: largest drop in consecutive eigenvalues (simple delta method)
    scree_suggestion = None
    if len(ev) >= 3:
        deltas = ev[:-1] - ev[1:]
        if np.max(deltas) > 0:
            elbow_idx = int(np.argmax(deltas)) + 2  # +2 for 1-based factor count
            scree_suggestion = max(1, min(elbow_idx, p))
    # === LAYER 2: Stability & Quality ===
    too_many = kaiser_n > max(6, p // 3)
    risk_level = "high" if kaiser_n > p // 2 else ("moderate" if kaiser_n > max(4, p // 3) else "low")
    rec_low = max(1, min(scree_suggestion or 3, p // 4))
    rec_high = max(rec_low + 2, min(kaiser_n, p // 3, 8))
    warnings = []
    if too_many:
        warnings.append("Large number of factors (%d) may indicate noisy structure" % kaiser_n)
    if p > 30 and kaiser_n > 8:
        warnings.append("Kaiser criterion overestimates factors with many items; consider scree or parallel analysis")
    if n < 100:
        warnings.append("Small sample (N=%d) reduces factor stability" % n)
    # === LAYER 3: Product Decision ===
    base = scree_suggestion or kaiser_n
    display_n = max(1, min(base, p // 3, 8))
    n_factors = display_n
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
    return json.dumps({
        "eigenvalues": eigenvalues, "loadings": loadings,
        "communalities": communalities, "varianceExplained": variance_explained,
        "suggestedFactors": display_n,
        "omega": max(0.0, min(1.0, omega)),
        "efa_metadata": {
            "raw_factor_estimation": {
                "kaiser_n": int(kaiser_n),
                "scree_suggestion": scree_suggestion,
                "parallel_analysis_n": None
            },
            "factor_stability": {
                "risk_level": risk_level,
                "too_many_factors": too_many,
                "recommended_range": [rec_low, rec_high],
                "warnings": warnings
            },
            "product_decision": {
                "display_factor_n": display_n,
                "decision_rule": "min(scree_n or kaiser_n, p/3, 8)",
                "type": "presentation_constraint"
            }
        }
    })`,
  },
  {
    id: "correlation",
    label: "相关性分析",
    fn: `def run_correlation(data_json):
    import json, numpy as np
    data = np.array(json.loads(data_json), dtype=float)
    p = data.shape[1]; r_mat = []; p_mat = []
    for i in range(p):
        r_row = []; p_row = []
        for j in range(p):
            a = data[:,i][~np.isnan(data[:,i])]; b = data[:,j][~np.isnan(data[:,j])]
            n = min(len(a), len(b))
            if n >= 3:
                ma = np.mean(a[:n]); mb = np.mean(b[:n])
                num = np.sum((a[:n]-ma)*(b[:n]-mb))
                den = np.sqrt(np.sum((a[:n]-ma)**2)*np.sum((b[:n]-mb)**2))
                r = num/den if den > 0 else 0.0
                # Simple p-value: use rough threshold (no scipy needed)
                if abs(r) > 0.5: p_val = 0.001
                elif abs(r) > 0.35: p_val = 0.01
                elif abs(r) > 0.25: p_val = 0.05
                else: p_val = 0.2
                r_row.append(round(float(r),4)); p_row.append(round(p_val,6))
            else: r_row.append(None); p_row.append(None)
        r_mat.append(r_row); p_mat.append(p_row)
    return json.dumps({"rMatrix": r_mat, "pMatrix": p_mat})`,
  },
  {
    id: "stability",
    fn: `def run_stability(data_json, n_bootstrap=200):
    import json, numpy as np
    np.random.seed(42)  # deterministic reproducibility
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
    const { rawData, likertColumns, columns, datasetVersion } = state;

    // === PREFLIGHT VALIDATION ===
    const preflightErrors: string[] = [];
    if (!rawData) preflightErrors.push("No data loaded");
    else if (rawData!.rowCount < 2) preflightErrors.push(`Insufficient rows: ${rawData!.rowCount} (need ≥ 2)`);
    else if (rawData!.headers.length < 1) preflightErrors.push("No columns detected");
    if (datasetVersion < 0) preflightErrors.push("Dataset version corrupted");

    if (preflightErrors.length > 0) {
      const msg = `Preflight validation FAILED:\n${preflightErrors.join("\n")}`;
      console.error("[preflight]", msg);
      throw new Error(msg);
    }
    console.log("[preflight] PASSED — dataset v" + datasetVersion + ", " + rawData!.rowCount + " rows × " + rawData!.headers.length + " cols");
    // === END PREFLIGHT ===

    let py = pyRef.current;
    if (!py) {
      py = await initEngine();
    }

    // Determine analysis columns: prefer Likert, fall back to numeric, exclude metadata
    const numericCols = columns.filter(c => c.type === "numeric" || c.type === "likert").map(c => c.name);
    const analyzableHeaders = rawData!.headers.filter(h => {
      const col = columns.find(c => c.name === h);
      return !col || col.type !== "id";
    });
    const analysisColumns = likertColumns.length > 0 ? likertColumns : numericCols.length > 0 ? numericCols : analyzableHeaders;

    // Input snapshot for audit
    const inputSnapshot = `${analysisColumns.slice(0, 5).join(",")}_n${rawData!.rowCount}_v${datasetVersion}`;

    // Use frozen matrix if codebook was applied, otherwise raw numeric conversion
    let data: number[][];
    const { mappingFreeze, confirmedReverseItems } = state;

    // Canonical version check — discard stale freeze before use
    if (mappingFreeze) {
      const rowMatch = mappingFreeze.matrix.length === rawData!.rows.length;
      const colMatch = mappingFreeze.headers.length === rawData!.headers.length;
      if (!rowMatch || !colMatch) {
        console.warn("[analysis] Freeze version v" + (mappingFreeze.appliedAt) + " stale vs dataset v" + datasetVersion + " — discarding");
        useAppStore.getState().setMappingFreeze(null);
      }
    }

    // Staleness check: freeze must match current rawData
    const freezeValid = mappingFreeze && mappingFreeze.headers.length === rawData!.headers.length
      && mappingFreeze.appliedAt > 0
      && mappingFreeze.matrix.length === rawData!.rows.length;

    if (freezeValid) {
      console.log("[analysis] Reading from frozen matrix:", mappingFreeze!.stats);
      data = extractLikertFromFreeze(mappingFreeze!, analysisColumns);
    } else {
      if (mappingFreeze && !freezeValid) {
        console.warn("[analysis] Freeze is stale — falling back to raw data");
        const lang = state.reportLanguage;
        useAppStore.getState().setDataWarnings([
          lang === "en"
            ? "The codebook may no longer match the current dataset — some variables may not be correctly mapped. Re-upload the codebook to ensure accurate mapping."
            : "检测到编码簿与当前数据可能不一致，部分变量可能未正确映射。建议重新上传编码簿以确保映射准确。"
        ]);
      }
      data = rawData!.rows.map((row) =>
        analysisColumns.map((col) => {
          const v = Number(row[col]);
          return isNaN(v) ? NaN : v;
        })
      );
    }

    // Repair pipeline: mapping(freeze) → reverse → missing → analysis
    // Step A: Reverse transform (before imputation for correct scale direction)
    // Skip if mappingFreeze exists — freeze already applied reverse during mapping
    if (!mappingFreeze && confirmedReverseItems.length > 0) {
      console.log("[analysis] Step A: Applying reverse transform for:", confirmedReverseItems);
      for (const col of confirmedReverseItems) {
        const colIdx = analysisColumns.indexOf(col);
        if (colIdx < 0) continue;
        const colVals = data.map((row) => row[colIdx]).filter((v) => !isNaN(v));
        if (colVals.length === 0) continue;
        const maxVal = Math.max(...colVals);
        const minVal = Math.min(...colVals);
        for (let r = 0; r < data.length; r++) {
          if (!isNaN(data[r][colIdx])) {
            data[r][colIdx] = maxVal + minVal - data[r][colIdx];
          }
        }
      }
    }

    // Step B: Missing value imputation (after reverse for correct column means)
    const { missingStrategy } = state;
    if (!mappingFreeze && missingStrategy.method === "mean_imputation") {
      console.log("[analysis] Step B: Applying mean imputation");
      for (let c = 0; c < (data[0]?.length ?? 0); c++) {
        const colVals = data.map((row) => row[c]).filter((v) => !isNaN(v));
        if (colVals.length === 0) continue;
        const colMean = colVals.reduce((a, b) => a + b, 0) / colVals.length;
        for (let r = 0; r < data.length; r++) {
          if (isNaN(data[r][c])) data[r][c] = colMean;
        }
      }
    }

    const dataJson = JSON.stringify(data);

    // Store data as a Python global to avoid string interpolation issues
    await py.runPythonAsync("import json");
    await py.runPythonAsync(`__data_json__ = '''${dataJson}'''`);

    const results = {} as Record<string, Record<string, unknown>>;

    // Run each step sequentially with progress
    for (const step of PYTHON_STEPS) {
      // Skip per-dim step — it requires a second argument and is called separately below
      if (step.id === "reliability_per_dim") continue;

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

    // Store descriptive results
    if (results.descriptive) {
      useAppStore.getState().setDescriptiveResults(results.descriptive as unknown as Record<string, unknown>[]);
    }

    // Per-dimension reliability — compute subscale alpha when dimensions exist
    const dims = state.dimensions;
    if (dims.length > 0 && results.reliability) {
      const dimSpec = dims.map((d) => ({
        name: d.name,
        indices: d.items.map((item) => analysisColumns.indexOf(item)).filter((i) => i >= 0),
      })).filter((d) => d.indices.length >= 2);

      if (dimSpec.length > 0) {
        try {
          const dimSpecJson = JSON.stringify(dimSpec);
          await py.runPythonAsync(`__dim_spec__ = '''${dimSpecJson}'''`);
          const perDimStep = PYTHON_STEPS.find((s) => s.id === "reliability_per_dim");
          if (perDimStep) {
            await py.runPythonAsync(perDimStep.fn);
            const dimResultJson = await py.runPythonAsync(`run_reliability_per_dim(__data_json__, __dim_spec__)`) as string;
            const dimResults = JSON.parse(dimResultJson);
            (results.reliability as Record<string, unknown>).dimensions = dimResults;
          }
        } catch (e) {
          console.warn("[analysis] Per-dimension reliability skipped:", e instanceof Error ? e.message : e);
        }
      }
    }

    // Build AnalysisResults from step results
    const finalResults = sanitizeForStorage(buildResults(results, analysisColumns));
    finalResults.meta.datasetVersion = datasetVersion;
    finalResults.meta.inputSnapshot = inputSnapshot;
    // Attach dimension info so the UI can reflect user's dimension grouping
    if (dims.length > 0) {
      finalResults.meta.dimensionCount = dims.length;
      (finalResults.meta as unknown as Record<string, unknown>).dimensions = dims.map(d => ({ name: d.name, items: d.items.length }));
    }
    useAppStore.getState().setResults(finalResults);

    const lang = useAppStore.getState().reportLanguage;
    const validation = validateResults(finalResults, lang);
    useAppStore.getState().setValidationReport(validation);

    const compressed = compressResults(finalResults, state.researchDesign);
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
    meta: { schemaVersion: "1.0.0", sampleSize: 0, itemCount: labels.length, dimensionCount: 1, timestamp: Date.now(), analysisDurationMs: 0, datasetVersion: 0, inputSnapshot: "" },
    reliability: { cronbachsAlpha: 0, standardizedAlpha: 0, mcdonaldsOmega: 0, itemTotalCorrelation: {}, alphaIfItemDeleted: {}, _meta: { value: null, status: "not_applicable" as const, reason: "Analysis not yet executed", confidence: 1.0 } },
    validity: { kmo: 0, kmoPerItem: {}, bartlettChiSquare: 0, bartlettDf: 0, bartlettPValue: 0, correlationMatrix: [], columnLabels: labels, _meta: { value: null, status: "not_applicable" as const, reason: "Analysis not yet executed", confidence: 1.0 } },
    efa: { eigenvalues: [], loadings: [], communalities: [], varianceExplained: [], rotation: "varimax", suggestedFactors: 0, itemLabels: labels, metadata: { raw_factor_estimation: { kaiser_n: 0, scree_suggestion: null, parallel_analysis_n: null }, factor_stability: { risk_level: "low", too_many_factors: false, recommended_range: [1, 3], warnings: [] }, product_decision: { display_factor_n: 0, decision_rule: "", type: "presentation_constraint" } }, _meta: { value: null, status: "not_applicable" as const, reason: "Analysis not yet executed", confidence: 1.0 } },
    stability: { bootstrapSamples: 0, alphaCurve: [], stabilityLevel: "unstable", recommendedSampleSize: 0, elbowPoint: null, _meta: { value: null, status: "not_applicable" as const, reason: "Analysis not yet executed", confidence: 1.0 } },
    recommendedMethod: "",
  };

  const r = raw.reliability;
  if (r && !r.error) {
    const itemCount = (r.nItems as number) ?? 0;
    const alpha = (r.cronbachsAlpha as number) ?? 0;
    const hasLikert = itemCount >= 2;
    results.reliability = {
      cronbachsAlpha: alpha,
      standardizedAlpha: (r.standardizedAlpha as number) ?? 0,
      mcdonaldsOmega: 0,
      itemTotalCorrelation: remapKeys(r.itemTotalCorrelation as Record<string, number> ?? {}, labels),
      alphaIfItemDeleted: remapKeys(filterNulls(r.alphaIfItemDeleted as Record<string, number | null> ?? {}), labels),
      dimensions: ((r as Record<string, unknown>).dimensions as Array<Record<string, unknown>>)?.map((d) => ({
        name: d.name as string,
        items: (d.items as number[])?.map((i) => labels[i] ?? String(i)) ?? [],
        cronbachsAlpha: (d.cronbachsAlpha as number) ?? 0,
        standardizedAlpha: (d.standardizedAlpha as number) ?? 0,
        itemTotalCorrelation: remapKeys(d.itemTotalCorrelation as Record<string, number> ?? {}, labels),
        alphaIfItemDeleted: remapKeys(filterNulls(d.alphaIfItemDeleted as Record<string, number | null> ?? {}), labels),
      })),
      _meta: hasLikert
        ? { value: alpha, status: "ok" as const, reason: `Cronbach's α computed on ${itemCount} items`, confidence: 1.0 }
        : { value: null, status: "not_applicable" as const, reason: "No Likert-scale items detected; reliability analysis requires ordinal variables", confidence: 1.0 },
    };
    results.meta.sampleSize = (r.nSamples as number) ?? 0;
    results.meta.itemCount = itemCount;
  }

  const v = raw.validity;
  if (v && !v.error) {
    const kmoVal = (v.kmo as number) ?? 0;
    const hasEnoughItems = labels.length >= 2;
    results.validity = {
      kmo: kmoVal,
      kmoPerItem: remapKeys(v.kmoPerItem as Record<string, number> ?? {}, labels),
      bartlettChiSquare: (v.bartlettChiSquare as number) ?? 0,
      bartlettDf: (v.bartlettDf as number) ?? 0,
      bartlettPValue: (v.bartlettPValue as number) ?? 0,
      correlationMatrix: (v.correlationMatrix as number[][]) ?? [],
      columnLabels: labels,
      _meta: kmoVal > 0
        ? { value: kmoVal, status: "ok" as const, reason: `KMO computed from ${labels.length} items`, confidence: 1.0 }
        : hasEnoughItems
          ? { value: null, status: "insufficient_data" as const, reason: "Validity analysis returned KMO=0; insufficient inter-item correlation", confidence: 0.7 }
          : { value: null, status: "not_applicable" as const, reason: "Requires ≥2 correlated items with sufficient variance", confidence: 1.0 },
    };
  }

  const e = raw.efa;
  if (e && !e.error) {
    const rawMeta = (e as Record<string, unknown>).efa_metadata as Record<string, unknown> | undefined;
    results.efa = {
      eigenvalues: (e.eigenvalues as number[]) ?? [],
      loadings: (e.loadings as number[][]) ?? [],
      communalities: (e.communalities as number[]) ?? [],
      varianceExplained: (e.varianceExplained as number[]) ?? [],
      rotation: "varimax",
      suggestedFactors: (e.suggestedFactors as number) ?? 0,
      itemLabels: labels,
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
      } : results.efa.metadata,
      _meta: (e.suggestedFactors as number ?? 0) > 0
        ? { value: (e.suggestedFactors as number) ?? 0, status: "ok" as const, reason: `EFA extracted ${(e.suggestedFactors as number)} factors from ${labels.length} items`, confidence: 1.0 }
        : labels.length >= 3
          ? { value: null, status: "insufficient_data" as const, reason: "EFA could not extract factors; insufficient inter-item correlation or KMO too low", confidence: 0.7 }
          : { value: null, status: "not_applicable" as const, reason: "Requires adequate KMO and sufficient item inter-correlations", confidence: 1.0 },
    };
    if ((e as Record<string, unknown>).omega !== undefined) {
      results.reliability.mcdonaldsOmega = (e as Record<string, unknown>).omega as number;
    }
  }

  const s = raw.stability;
  if (s && !s.error) {
    const bootN = (s.bootstrapSamples as number) ?? 0;
    results.stability = {
      bootstrapSamples: bootN,
      alphaCurve: (s.alphaCurve as { sampleSize: number; alpha: number }[]) ?? [],
      stabilityLevel: (s.stabilityLevel as "stable" | "moderate" | "unstable") ?? "unstable",
      recommendedSampleSize: (s.recommendedSampleSize as number) ?? 0,
      elbowPoint: (s.elbowPoint as number) ?? null,
      _meta: bootN > 0
        ? { value: (s.recommendedSampleSize as number) ?? 0, status: "ok" as const, reason: `Bootstrap stability assessed with ${bootN} samples`, confidence: 0.9 }
        : { value: null, status: "insufficient_data" as const, reason: "Sample too small for bootstrap stability assessment", confidence: 0.7 },
    };
  }

  return results;
}
