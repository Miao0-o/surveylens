// ============================================================
// Composite Scale Computation
// Parses user-defined composite labels and computes actual
// mean/sum scores from raw data for scale-level analysis.
// ============================================================

export type ComputeMethod = "mean" | "sum" | "weighted_mean" | "factor_score";

export interface ComputedVariable {
  name: string;
  method: ComputeMethod;
  sourceItems: string[];
}

const METHOD_MAP: Record<string, ComputeMethod> = {
  "均值": "mean", "mean": "mean",
  "总分": "sum", "sum": "sum",
  "加权均值": "weighted_mean", "weighted_mean": "weighted_mean",
  "因子得分": "factor_score", "factor_score": "factor_score",
};

/**
 * Parse a composite label string into a ComputedVariable.
 * Format: "name (method of item1, item2, ...)"
 * Returns null if the string is a raw variable name (not a composite).
 */
export function parseCompositeLabel(label: string): ComputedVariable | null {
  const match = label.match(/^(.+?)\s*\((.+?)\s+of\s+(.+)\)$/);
  if (!match) return null;
  const [, name, methodStr, itemsStr] = match;
  return {
    name: name.trim(),
    method: METHOD_MAP[methodStr.trim()] ?? "mean",
    sourceItems: itemsStr.split(",").map((s) => s.trim()),
  };
}

/**
 * Given all user-selected vars (mix of composite labels + raw column names),
 * compute actual numeric scores from raw data.
 *
 * Returns two matrices:
 * - scaleHeaders/scaleMatrix: composite scores + raw selected vars for scale-level analysis
 * - itemHeaders/itemMatrix: flattened source items for item-level reliability analysis
 */
export function computeCompositeScores(
  headers: string[],
  rows: Record<string, unknown>[],
  selectedVars: string[]
): {
  scaleHeaders: string[];
  scaleMatrix: number[][];
  itemHeaders: string[];
  itemMatrix: number[][];
} {
  const nRows = rows.length;
  const scaleHeaders: string[] = [];
  const scaleMatrix: number[][] = Array.from({ length: nRows }, () => []);
  const itemHeaders: string[] = [];
  const itemMatrix: number[][] = Array.from({ length: nRows }, () => []);

  for (const v of selectedVars) {
    const composite = parseCompositeLabel(v);
    if (composite) {
      // Composite: compute mean or sum from source items
      const itemIndices = composite.sourceItems.map((item) => headers.indexOf(item));

      // Resolve scale-level column name
      const scaleName = composite.name;
      scaleHeaders.push(scaleName);
      const scaleColIdx = scaleHeaders.length - 1;

      // Add source items to item-level columns (dedup)
      for (const item of composite.sourceItems) {
        if (!itemHeaders.includes(item)) {
          itemHeaders.push(item);
          const itemColIdx = itemHeaders.length - 1;
          for (let r = 0; r < nRows; r++) {
            itemMatrix[r][itemColIdx] = NaN; // filled below
          }
        }
      }

      // Compute composite for each row
      for (let r = 0; r < nRows; r++) {
        const vals: number[] = [];
        for (const idx of itemIndices) {
          if (idx < 0) continue;
          const rawVal = Number(rows[r][headers[idx]]);
          if (!isNaN(rawVal)) vals.push(rawVal);
        }
        if (vals.length > 0) {
          scaleMatrix[r][scaleColIdx] = composite.method === "sum"
            ? vals.reduce((a, b) => a + b, 0)
            : vals.reduce((a, b) => a + b, 0) / vals.length; // mean / weighted_mean / factor_score all default to mean
        } else {
          scaleMatrix[r][scaleColIdx] = NaN;
        }
      }
    } else {
      // Raw variable: extract directly
      const colIdx = headers.indexOf(v);
      if (colIdx < 0) continue; // column not found — skip

      scaleHeaders.push(v);
      const scaleColIdx = scaleHeaders.length - 1;

      if (!itemHeaders.includes(v)) {
        itemHeaders.push(v);
        const itemColIdx = itemHeaders.length - 1;
        for (let r = 0; r < nRows; r++) {
          itemMatrix[r][itemColIdx] = NaN;
        }
      }

      for (let r = 0; r < nRows; r++) {
        const val = Number(rows[r][headers[colIdx]]);
        scaleMatrix[r][scaleColIdx] = isNaN(val) ? NaN : val;
      }
    }
  }

  // Fill itemMatrix values from raw data
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < itemHeaders.length; c++) {
      const colIdx = headers.indexOf(itemHeaders[c]);
      const val = Number(rows[r][headers[colIdx]]);
      itemMatrix[r][c] = isNaN(val) ? NaN : val;
    }
  }

  return { scaleHeaders, scaleMatrix, itemHeaders, itemMatrix };
}
