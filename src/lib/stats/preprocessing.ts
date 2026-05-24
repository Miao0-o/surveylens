// ============================================================
// Preprocessing logic (runs in preworker — no Pyodide needed)
// ============================================================

import type { ColumnInfo, ParsedData, MissingStrategy } from "@/types";

/**
 * Profile all columns in parsed data.
 * Rule-based Likert detection: numeric + unique values ≤ 7.
 */
export function profileColumns(data: ParsedData): ColumnInfo[] {
  return data.headers.map((name) => {
    const values = data.rows.map((r) => r[name]);
    const numericValues: number[] = [];
    let textCount = 0;
    let missingCount = 0;
    const uniqueSet = new Set<string>();

    for (const v of values) {
      if (v === null || v === undefined || v === "") {
        missingCount++;
        continue;
      }
      const str = String(v).trim();
      uniqueSet.add(str);
      const num = Number(str);
      if (!isNaN(num) && str !== "") {
        numericValues.push(num);
      } else {
        textCount++;
      }
    }

    const total = values.length;
    const uniqueValues = uniqueSet.size;

    let type: ColumnInfo["type"] = "unknown";
    if (textCount === 0 && numericValues.length > 0) {
      if (uniqueValues <= 7 && uniqueValues >= 2) {
        type = "likert";
      } else if (uniqueValues <= total * 0.05) {
        type = "id";
      } else {
        type = "numeric";
      }
    } else if (textCount > 0 && numericValues.length === 0) {
      type = "text";
    } else if (textCount > 0 && numericValues.length > 0) {
      type = "text";
    }

    return {
      name,
      type,
      uniqueValues,
      min: numericValues.length > 0 ? Math.min(...numericValues) : undefined,
      max: numericValues.length > 0 ? Math.max(...numericValues) : undefined,
      mean:
        numericValues.length > 0
          ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
          : undefined,
      missingCount,
    };
  });
}

/**
 * Detect reverse-coded items using pairwise negative correlations among Likert columns.
 * Returns warnings for items that show strong negative correlations.
 */
export interface ReverseDetectionResult {
  column: string;
  correlatedWith: string;
  correlation: number;
  severity: "high" | "medium" | "low";
}

export function detectReverseItems(
  data: ParsedData,
  likertColumns: string[]
): ReverseDetectionResult[] {
  const results: ReverseDetectionResult[] = [];
  if (likertColumns.length < 2) return results;

  // Extract numeric vectors
  const vectors: Record<string, number[]> = {};
  for (const col of likertColumns) {
    vectors[col] = [];
    for (const row of data.rows) {
      const v = Number(row[col]);
      if (!isNaN(v)) vectors[col].push(v);
    }
  }

  // Pairwise Pearson correlation
  const cols = Object.keys(vectors);
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      const a = cols[i];
      const b = cols[j];
      const r = pearsonCorrelation(vectors[a], vectors[b]);
      if (r < -0.3) {
        results.push({
          column: r < -0.5 ? a : b,
          correlatedWith: r < -0.5 ? b : a,
          correlation: r,
          severity: r < -0.5 ? "high" : "medium",
        });
      }
    }
  }

  return results;
}

/**
 * Compute Pearson correlation between two arrays (truncate to min length).
 */
function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;

  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }

  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  return den === 0 ? 0 : num / den;
}

/**
 * Apply missing value strategy to data.
 * Returns cleaned rows and a report of what was done.
 */
export interface CleaningReport {
  originalRowCount: number;
  cleanedRowCount: number;
  removedRows: number;
  imputedColumns: string[];
  method: MissingStrategy["method"];
}

export function applyMissingStrategy(
  data: ParsedData,
  columns: ColumnInfo[],
  strategy: MissingStrategy
): { cleanedRows: Record<string, unknown>[]; report: CleaningReport } {
  const colNames = columns.map((c) => c.name);
  const maxMissingPerRow = Math.floor(colNames.length * strategy.threshold);

  if (strategy.method === "listwise") {
    const cleaned = data.rows.filter((row) => {
      const missingCount = colNames.filter((c) => {
        const v = row[c];
        return v === null || v === undefined || v === "";
      }).length;
      return missingCount <= maxMissingPerRow;
    });

    return {
      cleanedRows: cleaned,
      report: {
        originalRowCount: data.rowCount,
        cleanedRowCount: cleaned.length,
        removedRows: data.rowCount - cleaned.length,
        imputedColumns: [],
        method: "listwise",
      },
    };
  }

  // Mean imputation
  const colMeans: Record<string, number> = {};
  const imputedColumns: string[] = [];

  for (const col of columns) {
    if (col.type === "numeric" || col.type === "likert") {
      const vals = data.rows
        .map((r) => Number(r[col.name]))
        .filter((v) => !isNaN(v));
      if (vals.length > 0) {
        colMeans[col.name] = vals.reduce((s, v) => s + v, 0) / vals.length;
        if (col.missingCount > 0) imputedColumns.push(col.name);
      }
    }
  }

  const cleaned = data.rows.map((row) => {
    const newRow = { ...row };
    for (const col of columns) {
      const v = row[col.name];
      if ((v === null || v === undefined || v === "") && colMeans[col.name] !== undefined) {
        newRow[col.name] = colMeans[col.name];
      }
    }
    return newRow;
  });

  return {
    cleanedRows: cleaned,
    report: {
      originalRowCount: data.rowCount,
      cleanedRowCount: cleaned.length,
      removedRows: 0,
      imputedColumns,
      method: "mean_imputation",
    },
  };
}
