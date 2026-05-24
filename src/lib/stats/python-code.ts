// ============================================================
// Python statistical code — executed inside Pyodide Web Worker
// All functions take JSON input, return JSON output
// ============================================================

export const RELIABILITY_PY = `
import numpy as np
import json

def cronbach_alpha(data):
    """Compute Cronbach's alpha for a 2D array (items x samples)"""
    data = np.array(data, dtype=float)
    # Remove rows with NaN
    mask = ~np.isnan(data).any(axis=1)
    data = data[mask]
    if data.shape[0] < 3 or data.shape[1] < 2:
        return {"error": "Insufficient data (need >= 3 samples and >= 2 items)"}

    n_items = data.shape[1]
    item_vars = np.var(data, axis=0, ddof=1)
    total_scores = np.sum(data, axis=1)
    total_var = np.var(total_scores, ddof=1)

    if total_var == 0:
        return {"error": "Zero variance in total scores"}

    alpha = (n_items / (n_items - 1)) * (1 - np.sum(item_vars) / total_var)

    # Standardized alpha (correlation-based)
    if data.shape[0] > 1:
        corr = np.corrcoef(data.T)
        mean_r = (np.sum(corr) - n_items) / (n_items * (n_items - 1))
        std_alpha = (n_items * mean_r) / (1 + (n_items - 1) * mean_r)
    else:
        std_alpha = None

    # Item-total correlations (corrected)
    item_total_corr = {}
    for i in range(n_items):
        total_without_i = np.sum(np.delete(data, i, axis=1), axis=1)
        corr = np.corrcoef(data[:, i], total_without_i)[0, 1]
        item_total_corr[str(i)] = float(corr) if not np.isnan(corr) else 0.0

    # Alpha if item deleted
    alpha_if_deleted = {}
    for i in range(n_items):
        reduced = np.delete(data, i, axis=1)
        k_red = reduced.shape[1]
        if k_red < 2:
            alpha_if_deleted[str(i)] = None
            continue
        item_vars_red = np.var(reduced, axis=0, ddof=1)
        total_var_red = np.var(np.sum(reduced, axis=1), ddof=1)
        if total_var_red == 0:
            alpha_if_deleted[str(i)] = None
        else:
            alpha_if_deleted[str(i)] = float(
                (k_red / (k_red - 1)) * (1 - np.sum(item_vars_red) / total_var_red)
            )

    return {
        "cronbachsAlpha": float(max(0, min(1, alpha))),
        "standardizedAlpha": float(max(0, min(1, std_alpha))) if std_alpha is not None else None,
        "itemTotalCorrelation": item_total_corr,
        "alphaIfItemDeleted": alpha_if_deleted,
        "nSamples": int(data.shape[0]),
        "nItems": int(n_items),
    }
`;

export const VALIDITY_PY = `
import numpy as np
from scipy import linalg
import json

def kmo_bartlett(data):
    """Compute KMO and Bartlett's test of sphericity"""
    data = np.array(data, dtype=float)
    mask = ~np.isnan(data).any(axis=1)
    data = data[mask]
    n, p = data.shape

    if n < 5 or p < 2:
        return {"error": "Insufficient data"}

    # Correlation matrix
    R = np.corrcoef(data.T)
    # Handle any NaN in correlation
    R = np.nan_to_num(R, nan=0.0)

    # KMO: sum(r^2) / (sum(r^2) + sum(partial^2))
    # Partial correlations from inverse correlation matrix
    try:
        R_inv = linalg.inv(R)
    except Exception:
        return {"error": "Correlation matrix is singular"}

    # Anti-image correlation
    diag_sqrt = np.sqrt(np.diag(R_inv))
    A = R_inv / np.outer(diag_sqrt, diag_sqrt)

    # KMO overall
    r2_sum = 0.0
    partial2_sum = 0.0
    kmo_per_item = {}

    for i in range(p):
        for j in range(p):
            if i != j:
                r2_sum += R[i, j] ** 2
                partial2_sum += A[i, j] ** 2

    kmo = r2_sum / (r2_sum + partial2_sum) if (r2_sum + partial2_sum) > 0 else 0.0

    # KMO per item
    for i in range(p):
        num = 0.0
        den = 0.0
        for j in range(p):
            if i != j:
                num += R[i, j] ** 2
                den += R[i, j] ** 2 + A[i, j] ** 2
        kmo_per_item[str(i)] = float(num / den) if den > 0 else 0.0

    # Bartlett's test
    det_R = linalg.det(R)
    if det_R <= 0:
        chi2 = float('inf')
        pval = 0.0
    else:
        chi2 = -(n - 1 - (2 * p + 5) / 6) * np.log(det_R)
        df = p * (p - 1) / 2
        from scipy.stats import chi2 as chi2_dist
        pval = float(1 - chi2_dist.cdf(chi2, df))

    return {
        "kmo": float(kmo),
        "kmoPerItem": kmo_per_item,
        "bartlettChiSquare": float(chi2),
        "bartlettDf": int(p * (p - 1) / 2),
        "bartlettPValue": float(pval),
        "correlationMatrix": R.tolist(),
    }
`;

export const EFA_PY = `
import numpy as np
from scipy import linalg
import json

def efa_analysis(data, rotation="varimax"):
    """Exploratory Factor Analysis with eigenvalue decomposition and rotation"""
    data = np.array(data, dtype=float)
    mask = ~np.isnan(data).any(axis=1)
    data = data[mask]
    n, p = data.shape

    if n < 5 or p < 3:
        return {"error": "Insufficient data (need >= 5 samples and >= 3 items)"}

    # Correlation matrix
    R = np.corrcoef(data.T)
    R = np.nan_to_num(R, nan=0.0)

    # Eigenvalue decomposition
    eigenvalues, eigenvectors = linalg.eigh(R)
    # Sort descending
    idx = np.argsort(eigenvalues)[::-1]
    eigenvalues = eigenvalues[idx]
    eigenvectors = eigenvectors[:, idx]

    # Kaiser criterion: keep factors with eigenvalue > 1
    suggested_factors = int(np.sum(eigenvalues > 1.0))
    suggested_factors = max(1, min(suggested_factors, p // 2))

    # Use suggested number of factors
    n_factors = suggested_factors
    eigenvalues_sel = eigenvalues[:n_factors]
    loadings = eigenvectors[:, :n_factors] * np.sqrt(eigenvalues_sel)

    # Varimax rotation
    if rotation == "varimax" and n_factors > 1:
        loadings = varimax_rotation(loadings)

    # Communalities = sum of squared loadings per item
    communalities = np.sum(loadings ** 2, axis=1).tolist()

    # Variance explained per factor
    ss_loadings = np.sum(loadings ** 2, axis=0)
    variance_explained = (ss_loadings / p).tolist()

    return {
        "eigenvalues": eigenvalues.tolist(),
        "loadings": loadings.tolist(),
        "communalities": [float(c) for c in communalities],
        "varianceExplained": [float(v) for v in variance_explained],
        "rotation": rotation,
        "suggestedFactors": int(suggested_factors),
    }

def varimax_rotation(loadings, max_iter=100, tol=1e-6):
    """Varimax rotation (Kaiser, 1958)"""
    L = np.array(loadings, dtype=float)
    n_items, n_factors = L.shape

    for _ in range(max_iter):
        # Compute current criterion
        h2 = np.sum(L ** 2, axis=1, keepdims=True)
        U = L / np.sqrt(h2)
        V = L ** 3 - L * np.sum(L ** 2, axis=1, keepdims=True) / n_items

        # SVD of L^T * V
        M = L.T @ V
        U_svd, _, Vt_svd = linalg.svd(M)

        # Rotation matrix
        T = U_svd @ Vt_svd

        # Check convergence
        if np.max(np.abs(T - np.eye(n_factors))) < tol:
            break

        L = L @ T

    return L
`;

export const STABILITY_PY = `
import numpy as np
import json

def bootstrap_stability(data, n_bootstrap=200):
    """Bootstrap stability analysis: resample with replacement at increasing sample sizes"""
    data = np.array(data, dtype=float)
    mask = ~np.isnan(data).any(axis=1)
    data = data[mask]
    n, p = data.shape

    if n < 20:
        return {"error": "Sample too small for bootstrap (need >= 20)"}

    # Sample sizes to test: from min(30) to n, in steps
    sizes = []
    start = max(10, int(n * 0.1))
    for s in range(start, n + 1, max(1, (n - start) // 15)):
        sizes.append(s)
    if sizes[-1] != n:
        sizes.append(n)

    alpha_curve = []
    for size in sizes:
        alphas = []
        for _ in range(min(n_bootstrap, 200)):
            idx = np.random.choice(n, size=size, replace=True)
            sample = data[idx]
            # Compute alpha for this bootstrap sample
            k = sample.shape[1]
            item_vars = np.var(sample, axis=0, ddof=1)
            total_var = np.var(np.sum(sample, axis=1), ddof=1)
            if total_var > 0 and k > 1:
                a = (k / (k - 1)) * (1 - np.sum(item_vars) / total_var)
                alphas.append(max(0, min(1, a)))

        if alphas:
            alpha_curve.append({
                "sampleSize": int(size),
                "alpha": float(np.mean(alphas)),
            })

    # Determine stability level based on final alpha and curve flatness
    final_alpha = alpha_curve[-1]["alpha"] if alpha_curve else 0.0
    if len(alpha_curve) >= 3:
        tail_alphas = [p["alpha"] for p in alpha_curve[-3:]]
        spread = max(tail_alphas) - min(tail_alphas)
        if spread < 0.02:
            level = "stable"
        elif spread < 0.05:
            level = "moderate"
        else:
            level = "unstable"
    else:
        level = "unstable"

    # Find elbow point: where alpha gain per 10 samples drops below threshold
    elbow = None
    if len(alpha_curve) >= 4:
        for i in range(2, len(alpha_curve)):
            gain = alpha_curve[i]["alpha"] - alpha_curve[i-2]["alpha"]
            if gain < 0.005:
                elbow = alpha_curve[i]["sampleSize"]
                break

    rec_sample_size = elbow if elbow is not None else n
    rec_sample_size = max(30, min(rec_sample_size, n))

    return {
        "bootstrapSamples": int(n_bootstrap),
        "alphaCurve": alpha_curve,
        "stabilityLevel": level,
        "recommendedSampleSize": int(rec_sample_size),
        "elbowPoint": elbow,
    }
`;

// Combined entry point: runs all analyses
export const MAIN_PY = `
import json
import numpy as np
import time

def run_all_analyses(input_json):
    """Main entry point: parse input, run all analyses, return JSON results"""
    start = time.time()
    inp = json.loads(input_json)
    data = inp["data"]          # 2D array (rows x cols)
    item_labels = inp.get("itemLabels", [])
    rotation = inp.get("rotation", "varimax")
    n_bootstrap = inp.get("nBootstrap", 200)

    if not data or len(data) < 3:
        return json.dumps({"error": "Insufficient data"})

    results = {}

    # 1. Reliability
    try:
        from reliability_py import cronbach_alpha
        rel = cronbach_alpha(data)
        # Map numeric keys to item labels
        if item_labels:
            rel["itemTotalCorrelation"] = {item_labels[int(k)]: v for k, v in rel.get("itemTotalCorrelation", {}).items()}
            rel["alphaIfItemDeleted"] = {item_labels[int(k)]: v for k, v in rel.get("alphaIfItemDeleted", {}).items()}
        results["reliability"] = rel
    except Exception as e:
        results["reliability"] = {"error": str(e)}

    # 2. Validity
    try:
        from validity_py import kmo_bartlett
        val = kmo_bartlett(data)
        if item_labels:
            val["kmoPerItem"] = {item_labels[int(k)]: v for k, v in val.get("kmoPerItem", {}).items()}
            val["columnLabels"] = item_labels
        results["validity"] = val
    except Exception as e:
        results["validity"] = {"error": str(e)}

    # 3. EFA
    try:
        from efa_py import efa_analysis
        efa = efa_analysis(data, rotation)
        efa["itemLabels"] = item_labels
        results["efa"] = efa
    except Exception as e:
        results["efa"] = {"error": str(e)}

    # 4. Stability
    try:
        from stability_py import bootstrap_stability
        stab = bootstrap_stability(data, n_bootstrap)
        results["stability"] = stab
    except Exception as e:
        results["stability"] = {"error": str(e)}

    # 5. Statistical method recommendation
    n, p = np.array(data).shape
    results["recommendedMethod"] = recommend_method(data, n)

    duration = (time.time() - start) * 1000
    results["meta"] = {
        "analysisDurationMs": duration,
        "sampleSize": n,
        "itemCount": p,
    }

    return json.dumps(results)

def recommend_method(data, n):
    """Recommend statistical methods based on data characteristics"""
    data = np.array(data, dtype=float)
    p = data.shape[1]

    recs = []
    # Check skewness
    skews = []
    for i in range(data.shape[1]):
        col = data[:, i]
        col = col[~np.isnan(col)]
        if len(col) > 2:
            m3 = np.mean((col - np.mean(col)) ** 3)
            s3 = np.std(col, ddof=1) ** 3
            skews.append(m3 / s3 if s3 > 0 else 0)

    avg_skew = np.mean(np.abs(skews)) if skews else 0

    # Check unique values (Likert levels)
    n_levels = len(set(int(v) for v in data.flatten() if not np.isnan(v)))

    if avg_skew > 1.0:
        recs.append("Polychoric correlation (数据偏态明显)")
    if n_levels <= 5:
        recs.append("Oblimin rotation (Likert数据推荐斜交旋转)")
    if n < 150:
        recs.append(f"建议样本量 ≥ {n * 2} (当前{n}偏小)")
    if p > 20:
        recs.append("考虑分维度分析 (题项较多)")

    if not recs:
        recs.append("标准Pearson相关 + Varimax旋转")
    elif len(recs) == 1 and n_levels <= 5:
        recs = ["推荐使用Polychoric相关 + Oblimin旋转 (Likert量表标准做法)"]

    return "; ".join(recs)
`;
