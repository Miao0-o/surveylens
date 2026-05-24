// ============================================================
// Data Sanitizer — ensures all computed values are JSON-safe
// NaN, Infinity, -Infinity → null
// ============================================================

export function sanitizeForStorage<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => {
      if (typeof value === "number" && !isFinite(value)) return null;
      return value;
    })
  );
}

export function clean2DArray(arr: number[][]): (number | null)[][] {
  return arr.map((row) => row.map((v) => (!isFinite(v) ? null : v)));
}
