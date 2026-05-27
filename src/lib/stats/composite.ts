// ============================================================
// Composite Scale Computation — Three-Layer Architecture
//
// Layer 1 (Raw)    → rawMatrix (from file parsing)
// Layer 2 (Measurement) → itemMatrix (cleaned, reverse-coded, imputed)
// Layer 3 (Construct)   → scaleMatrix (aggregated composites/factors)
//
// parseCompositeLabel: UI string → StructuredComposite
// aggregateToScaleMatrix: itemMatrix → scaleMatrix
// ============================================================

export type ComputeMethod = "mean" | "sum" | "weighted_mean" | "factor_score";

export interface ComputedVariable {
  name: string;
  method: ComputeMethod;
  sourceItems: string[];
}

/** Structured composite — internal representation, not UI-facing */
export interface StructuredComposite {
  id: string;          // e.g., "anxiety_mean_q1_q2"
  label: string;       // e.g., "焦虑维度"
  method: ComputeMethod;
  sourceItems: string[];
}

const METHOD_MAP: Record<string, ComputeMethod> = {
  "均值": "mean", "mean": "mean",
  "总分": "sum", "sum": "sum",
  "加权均值": "weighted_mean", "weighted_mean": "weighted_mean",
  "因子得分": "factor_score", "factor_score": "factor_score",
};

/** Generate a stable internal id from label + method + source items */
function buildCompositeId(label: string, method: ComputeMethod, sourceItems: string[]): string {
  const slug = label.replace(/[^a-zA-Z0-9一-鿿]/g, "_").toLowerCase();
  return `${slug}_${method}_${sourceItems.map(s => s.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()).join("_")}`;
}

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
 * parse them into a flat list: StructuredComposite[] for composites + string[] for raw vars.
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
 * Collect all unique item-level headers needed:
 * sourceItems from all composites + raw selected variables.
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

/**
 * Build itemMatrix from raw data for the specified item headers.
 * Extracts numeric values from raw rows.
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

/**
 * Aggregate from cleaned itemMatrix → scaleMatrix.
 *
 * Composites: mean or sum of their source items (looked up in itemHeaders).
 * Raw vars: copied directly from the corresponding column in itemMatrix.
 *
 * Returns scaleHeaders (labels for display) + scaleMatrix (numeric values).
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
} {
  const nRows = itemMatrix.length;
  const scaleHeaders: string[] = [];
  const scaleIds: string[] = [];
  const scaleMatrix: number[][] = Array.from({ length: nRows }, () => []);

  for (const c of composites) {
    scaleHeaders.push(c.label);
    scaleIds.push(c.id);
    const colIdx = scaleHeaders.length - 1;
    const sourceIndices = c.sourceItems.map((item) => itemHeaders.indexOf(item));

    for (let r = 0; r < nRows; r++) {
      const vals: number[] = [];
      for (const idx of sourceIndices) {
        if (idx >= 0 && !isNaN(itemMatrix[r][idx])) vals.push(itemMatrix[r][idx]);
      }
      if (vals.length > 0) {
        scaleMatrix[r][colIdx] = c.method === "sum"
          ? vals.reduce((a, b) => a + b, 0)
          : vals.reduce((a, b) => a + b, 0) / vals.length;
      } else {
        scaleMatrix[r][colIdx] = NaN;
      }
    }
  }

  for (const v of rawVars) {
    const itemIdx = itemHeaders.indexOf(v);
    scaleHeaders.push(v);
    scaleIds.push(v);
    const colIdx = scaleHeaders.length - 1;
    for (let r = 0; r < nRows; r++) {
      scaleMatrix[r][colIdx] = itemIdx >= 0 ? itemMatrix[r][itemIdx] : NaN;
    }
  }

  return { scaleHeaders, scaleIds, scaleMatrix };
}
