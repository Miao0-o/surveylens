// ============================================================
// Composite Scale Computation — Three-Layer Architecture
//
// Layer 1 (Raw)    → rawMatrix (from file parsing)
// Layer 2 (Measurement) → itemMatrix (cleaned, reverse-coded, imputed)
// Layer 3 (Construct)   → scaleMatrix (aggregated composites/factors)
//
// Composite methods: mean, sum, weighted, pca (future: cfa)
// parseCompositeLabel: UI string → StructuredComposite
// aggregateToScaleMatrix: itemMatrix → scaleMatrix + diagnostics
// ============================================================

export type CompositeMethod = "mean" | "sum" | "weighted" | "pca";
export const ALL_COMPOSITE_METHODS: CompositeMethod[] = ["mean", "sum", "weighted", "pca"];

/** Legacy ComputeMethod — maps to CompositeMethod */
export type ComputeMethod = CompositeMethod;

export interface ComputedVariable {
  name: string;
  method: CompositeMethod;
  sourceItems: string[];
}

/** Structured composite — internal representation, not UI-facing */
export interface StructuredComposite {
  id: string;          // e.g., "anxiety_mean_q1_q2"
  label: string;       // e.g., "焦虑维度"
  method: CompositeMethod;
  sourceItems: string[];
  /** Optional: explicit user weights for weighted method (must match sourceItems length) */
  weights?: number[];
}

/** Per-composite diagnostics returned by aggregation */
export interface CompositeDiagnostics {
  compositeId: string;
  compositeLabel: string;
  methodRequested: CompositeMethod;
  methodUsed: CompositeMethod;
  /** PCA-specific: variance explained by first component */
  varianceExplained?: number;
  /** PCA-specific: item loadings on first component */
  loadings?: Record<string, number>;
  /** Whether PCA fell back to mean */
  fallbackTriggered: boolean;
  /** Human-readable warnings */
  warnings: string[];
}

const METHOD_MAP: Record<string, CompositeMethod> = {
  "均值": "mean", "mean": "mean",
  "总分": "sum", "sum": "sum",
  "加权均值": "weighted", "weighted": "weighted",
  "PCA": "pca", "pca": "pca",
  "factor_score": "pca", // legacy alias
};

// Chinese method labels (display only, never used internally)
const METHOD_LABELS: Record<CompositeMethod, string> = {
  mean: "均值",
  sum: "总分",
  weighted: "加权",
  pca: "PCA",
};

/** Generate a stable internal id from label + method + source items */
function buildCompositeId(label: string, method: CompositeMethod, sourceItems: string[]): string {
  const slug = label.replace(/[^a-zA-Z0-9一-鿿]/g, "_").toLowerCase();
  return `${slug}_${method}_${sourceItems.map(s => s.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()).join("_")}`;
}

// ============================================================
// Parsing
// ============================================================

/**
 * Parse a UI composite label into structured internal representation.
 * Format: "name (method of item1, item2, ...)"
 * Returns null if the string is a raw variable name (not a composite).
 */
export function parseCompositeLabel(label: string): StructuredComposite | null {
  const match = label.match(/^(.+?)\s*\((.+?)\s+of\s+(.+)\)$/);
  if (!match) return null;
  const [, name, methodStr, itemsStr] = match;
  const cleanLabel = name.trim();
  const method = METHOD_MAP[methodStr.trim()] ?? "mean";
  const sourceItems = itemsStr.split(",").map((s) => s.trim());
  return {
    id: buildCompositeId(cleanLabel, method, sourceItems),
    label: cleanLabel,
    method,
    sourceItems,
  };
}

/**
 * Given all user-selected vars (mix of composite labels + raw column names),
 * parse them into composites + raw vars.
 */
export function resolveSelectedVars(selectedVars: string[]): {
  composites: StructuredComposite[];
  rawVars: string[];
} {
  const composites: StructuredComposite[] = [];
  const rawVars: string[] = [];
  for (const v of selectedVars) {
    const parsed = parseCompositeLabel(v);
    if (parsed) {
      composites.push(parsed);
    } else {
      rawVars.push(v);
    }
  }
  return { composites, rawVars };
}

/**
 * Collect all unique item-level headers: sourceItems from all composites + raw selected variables.
 */
export function collectItemHeaders(
  composites: StructuredComposite[],
  rawVars: string[]
): string[] {
  const headers: string[] = [];
  for (const c of composites) {
    for (const item of c.sourceItems) {
      if (!headers.includes(item)) headers.push(item);
    }
  }
  for (const v of rawVars) {
    if (!headers.includes(v)) headers.push(v);
  }
  return headers;
}

// ============================================================
// Matrix construction
// ============================================================

/**
 * Build itemMatrix from raw data for the specified item headers.
 */
export function buildItemMatrix(
  rawHeaders: string[],
  rawRows: Record<string, unknown>[],
  itemHeaders: string[]
): number[][] {
  const nRows = rawRows.length;
  const matrix: number[][] = Array.from({ length: nRows }, () =>
    new Array(itemHeaders.length).fill(NaN)
  );

  for (let c = 0; c < itemHeaders.length; c++) {
    const colIdx = rawHeaders.indexOf(itemHeaders[c]);
    if (colIdx < 0) continue;
    for (let r = 0; r < nRows; r++) {
      const val = Number(rawRows[r][rawHeaders[colIdx]]);
      matrix[r][c] = isNaN(val) ? NaN : val;
    }
  }

  return matrix;
}

// ============================================================
// PCA computation (pure JS — no Pyodide dependency)
// ============================================================

/**
 * Compute column means, skipping NaN.
 */
function columnMeans(matrix: number[][]): number[] {
  const nCols = matrix[0]?.length ?? 0;
  const means: number[] = [];
  for (let c = 0; c < nCols; c++) {
    const vals = matrix.map(row => row[c]).filter(v => !isNaN(v));
    means.push(vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
  }
  return means;
}

/**
 * Compute column standard deviations, skipping NaN.
 */
function columnStds(matrix: number[][], means: number[]): number[] {
  const nCols = matrix[0]?.length ?? 0;
  const stds: number[] = [];
  for (let c = 0; c < nCols; c++) {
    const vals = matrix.map(row => row[c]).filter(v => !isNaN(v));
    if (vals.length < 2) { stds.push(0); continue; }
    const m = means[c];
    const ss = vals.reduce((s, v) => s + (v - m) ** 2, 0);
    stds.push(Math.sqrt(ss / (vals.length - 1)));
  }
  return stds;
}

/**
 * Standardize selected columns of a matrix to z-scores (in-place on a copy).
 * Columns with zero std remain zero-centered.
 */
function standardizeColumns(
  matrix: number[][],
  colIndices: number[]
): { standardized: number[][]; means: number[]; stds: number[] } {
  const nRows = matrix.length;
  const fullMeans = columnMeans(matrix);
  const fullStds = columnStds(matrix, fullMeans);

  const standardized: number[][] = matrix.map(row => [...row]);

  for (const c of colIndices) {
    const mean = fullMeans[c];
    const std = fullStds[c];
    for (let r = 0; r < nRows; r++) {
      if (!isNaN(standardized[r][c])) {
        standardized[r][c] = std > 1e-10 ? (standardized[r][c] - mean) / std : 0;
      } else {
        standardized[r][c] = 0; // imputed NaN → mean (0 in z-score)
      }
    }
  }

  // Return only the stats for requested columns
  const means = colIndices.map(i => fullMeans[i]);
  const stds = colIndices.map(i => fullStds[i]);
  return { standardized, means, stds };
}

/**
 * Compute correlation matrix for selected columns.
 */
function correlationMatrix(
  matrix: number[][],
  colIndices: number[]
): number[][] {
  const n = colIndices.length;
  const nRows = matrix.length;
  const R: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  const { standardized } = standardizeColumns(matrix, colIndices);

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const ci = colIndices[i];
      const cj = colIndices[j];
      let sum = 0;
      let count = 0;
      for (let r = 0; r < nRows; r++) {
        if (!isNaN(standardized[r][ci]) && !isNaN(standardized[r][cj])) {
          sum += standardized[r][ci] * standardized[r][cj];
          count++;
        }
      }
      R[i][j] = count > 1 ? sum / (count - 1) : 0;
      R[j][i] = R[i][j];
    }
  }
  return R;
}

/**
 * Power iteration to find the first eigenvector of a symmetric matrix.
 * Returns { eigenvalue, eigenvector }.
 */
function powerIteration(
  matrix: number[][],
  maxIter: number = 100,
  tol: number = 1e-8
): { eigenvalue: number; eigenvector: number[] } {
  const n = matrix.length;
  if (n === 0) return { eigenvalue: 0, eigenvector: [] };
  if (n === 1) return { eigenvalue: matrix[0][0], eigenvector: [1] };

  // Initialize with ones
  let vec = new Array(n).fill(1);
  let lambda = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    // Matrix-vector multiply
    const next = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        next[i] += matrix[i][j] * vec[j];
      }
    }

    // Normalize
    const norm = Math.sqrt(next.reduce((s, v) => s + v * v, 0));
    if (norm < 1e-15) break;
    for (let i = 0; i < n; i++) next[i] /= norm;

    // Rayleigh quotient for eigenvalue
    let newLambda = 0;
    for (let i = 0; i < n; i++) {
      let rowSum = 0;
      for (let j = 0; j < n; j++) rowSum += matrix[i][j] * next[j];
      newLambda += next[i] * rowSum;
    }

    if (Math.abs(newLambda - lambda) < tol) {
      return { eigenvalue: newLambda, eigenvector: next };
    }

    vec = next;
    lambda = newLambda;
  }

  return { eigenvalue: lambda, eigenvector: vec };
}

/**
 * Compute PCA-weighted composite scores.
 *
 * SAFETY RULES:
 * - n items >= 3
 * - first component variance explained >= 50%
 * - correlation matrix not singular
 * - inter-item correlations sufficient (at least one r > 0.2)
 *
 * Falls back to mean if any rule fails.
 */
function computePCAScore(
  itemMatrix: number[][],
  colIndices: number[]
): {
  scores: number[];
  varianceExplained: number;
  loadings: number[];
  fallback: boolean;
  warnings: string[];
} {
  const n = colIndices.length;
  const warnings: string[] = [];

  // Rule 1: minimum 3 items
  if (n < 3) {
    return {
      scores: [],
      varianceExplained: 0,
      loadings: [],
      fallback: true,
      warnings: ["PCA requires ≥ 3 items — fallback to mean aggregation."],
    };
  }

  // Compute correlation matrix
  const R = correlationMatrix(itemMatrix, colIndices);

  // Rule 2: Check for sufficient inter-item correlations
  let maxR = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(R[i][j]) > maxR) maxR = Math.abs(R[i][j]);
    }
  }
  if (maxR < 0.2) {
    return {
      scores: [],
      varianceExplained: 0,
      loadings: [],
      fallback: true,
      warnings: ["Inter-item correlations too weak (max |r| < 0.2) — fallback to mean aggregation."],
    };
  }

  // Rule 3: Check for singular matrix (determinant ≈ 0)
  // Simple check: any two rows too highly correlated (|r| > 0.999)
  let nearlySingular = false;
  for (let i = 0; i < n && !nearlySingular; i++) {
    for (let j = i + 1; j < n && !nearlySingular; j++) {
      if (Math.abs(R[i][j]) > 0.999) nearlySingular = true;
    }
  }
  if (nearlySingular) {
    return {
      scores: [],
      varianceExplained: 0,
      loadings: [],
      fallback: true,
      warnings: ["Correlation matrix nearly singular — fallback to mean aggregation."],
    };
  }

  // First principal component via power iteration
  const { eigenvalue, eigenvector } = powerIteration(R);

  // Variance explained: eigenvalue / n (since total variance = trace(R) = n for correlation matrix)
  const varianceExplained = eigenvalue / n;

  // Rule 4: variance explained >= 50%
  if (varianceExplained < 0.50) {
    return {
      scores: [],
      varianceExplained,
      loadings: eigenvector.map(v => Math.round(v * 1000) / 1000),
      fallback: true,
      warnings: [
        `First component explains only ${(varianceExplained * 100).toFixed(0)}% of variance (< 50%) — fallback to mean aggregation.`,
        "PCA composite fallback triggered due to insufficient dimensional coherence.",
      ],
    };
  }

  // Compute PCA scores: standardized items weighted by loadings
  const { standardized } = standardizeColumns(itemMatrix, colIndices);
  const nRows = itemMatrix.length;
  const scores: number[] = [];

  for (let r = 0; r < nRows; r++) {
    let score = 0;
    let totalWeight = 0;
    for (let i = 0; i < n; i++) {
      const ci = colIndices[i];
      const w = Math.abs(eigenvector[i]); // use absolute loading as weight
      if (!isNaN(standardized[r][ci])) {
        score += w * standardized[r][ci];
        totalWeight += w;
      }
    }
    scores.push(totalWeight > 0 ? score / totalWeight : 0);
  }

  // Normalize scores to approximate the original item scale
  // Map z-scores back to original metric using mean of item means/stds
  const origMeans = columnMeans(itemMatrix).filter((_, i) => colIndices.includes(i));
  const origStds = columnStds(itemMatrix, columnMeans(itemMatrix)).filter((_, i) => colIndices.includes(i));
  const avgMean = origMeans.reduce((a, b) => a + b, 0) / origMeans.length;
  const avgStd = origStds.reduce((a, b) => a + b, 0) / origStds.length;
  const normalized = scores.map(s => avgMean + s * avgStd);

  return {
    scores: normalized,
    varianceExplained: Math.round(varianceExplained * 1000) / 1000,
    loadings: eigenvector.map(v => Math.round(v * 1000) / 1000),
    fallback: false,
    warnings: [],
  };
}

// ============================================================
// Aggregation (Layer 2 → Layer 3)
// ============================================================

/**
 * Aggregate from cleaned itemMatrix → scaleMatrix.
 *
 * Supports: mean, sum, weighted, pca
 * PCA includes safety gates — falls back to mean with warnings.
 */
export function aggregateToScaleMatrix(
  itemHeaders: string[],
  itemMatrix: number[][],
  composites: StructuredComposite[],
  rawVars: string[]
): {
  scaleHeaders: string[];
  scaleIds: string[];
  scaleMatrix: number[][];
  diagnostics: CompositeDiagnostics[];
} {
  const nRows = itemMatrix.length;
  const scaleHeaders: string[] = [];
  const scaleIds: string[] = [];
  const scaleMatrix: number[][] = Array.from({ length: nRows }, () => []);
  const diagnostics: CompositeDiagnostics[] = [];

  for (const c of composites) {
    scaleHeaders.push(c.label);
    scaleIds.push(c.id);
    const colIdx = scaleHeaders.length - 1;
    const sourceIndices = c.sourceItems.map((item) => itemHeaders.indexOf(item));

    const diag: CompositeDiagnostics = {
      compositeId: c.id,
      compositeLabel: c.label,
      methodRequested: c.method,
      methodUsed: c.method,
      fallbackTriggered: false,
      warnings: [],
    };

    if (c.method === "pca") {
      // Attempt PCA, fallback to mean
      const pcaResult = computePCAScore(itemMatrix, sourceIndices);

      if (pcaResult.fallback) {
        diag.methodUsed = "mean";
        diag.fallbackTriggered = true;
        diag.warnings = pcaResult.warnings;
        if (pcaResult.loadings.length > 0) {
          diag.varianceExplained = pcaResult.varianceExplained;
          diag.loadings = {};
          c.sourceItems.forEach((item, i) => {
            diag.loadings![item] = pcaResult.loadings[i] ?? 0;
          });
        }
        // Fallback: compute mean
        for (let r = 0; r < nRows; r++) {
          const vals: number[] = [];
          for (const idx of sourceIndices) {
            if (idx >= 0 && !isNaN(itemMatrix[r][idx])) vals.push(itemMatrix[r][idx]);
          }
          scaleMatrix[r][colIdx] = vals.length > 0
            ? vals.reduce((a, b) => a + b, 0) / vals.length
            : NaN;
        }
      } else {
        diag.varianceExplained = pcaResult.varianceExplained;
        diag.loadings = {};
        c.sourceItems.forEach((item, i) => {
          diag.loadings![item] = pcaResult.loadings[i] ?? 0;
        });
        for (let r = 0; r < nRows; r++) {
          scaleMatrix[r][colIdx] = pcaResult.scores[r];
        }
      }
    } else if (c.method === "weighted" && c.weights && c.weights.length === c.sourceItems.length) {
      // Weighted composite: Σ(weight_i * item_i) / Σ(weight_i)
      for (let r = 0; r < nRows; r++) {
        let weightedSum = 0;
        let totalWeight = 0;
        for (let i = 0; i < sourceIndices.length; i++) {
          const idx = sourceIndices[i];
          if (idx >= 0 && !isNaN(itemMatrix[r][idx])) {
            weightedSum += c.weights[i] * itemMatrix[r][idx];
            totalWeight += c.weights[i];
          }
        }
        scaleMatrix[r][colIdx] = totalWeight > 0 ? weightedSum / totalWeight : NaN;
      }
    } else if (c.method === "sum") {
      // Sum composite
      for (let r = 0; r < nRows; r++) {
        const vals: number[] = [];
        for (const idx of sourceIndices) {
          if (idx >= 0 && !isNaN(itemMatrix[r][idx])) vals.push(itemMatrix[r][idx]);
        }
        scaleMatrix[r][colIdx] = vals.length > 0
          ? vals.reduce((a, b) => a + b, 0)
          : NaN;
      }
    } else {
      // Mean (default)
      for (let r = 0; r < nRows; r++) {
        const vals: number[] = [];
        for (const idx of sourceIndices) {
          if (idx >= 0 && !isNaN(itemMatrix[r][idx])) vals.push(itemMatrix[r][idx]);
        }
        scaleMatrix[r][colIdx] = vals.length > 0
          ? vals.reduce((a, b) => a + b, 0) / vals.length
          : NaN;
      }
    }

    diagnostics.push(diag);
  }

  // Raw variables: copy from itemMatrix
  for (const v of rawVars) {
    const itemIdx = itemHeaders.indexOf(v);
    scaleHeaders.push(v);
    scaleIds.push(v);
    const colIdx = scaleHeaders.length - 1;
    for (let r = 0; r < nRows; r++) {
      scaleMatrix[r][colIdx] = itemIdx >= 0 ? itemMatrix[r][itemIdx] : NaN;
    }
  }

  return { scaleHeaders, scaleIds, scaleMatrix, diagnostics };
}
