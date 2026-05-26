// ============================================================
// Mapping Engine — 4-layer safe matching + Reverse Transform
// All mapping happens HERE. Analysis pipeline reads frozen output.
// ============================================================

import type { CodebookSchema, MappingMethod, MappingLogEntry, MappingFreeze, MappingFreezeStats } from "./schema";

/** Safe synonym groups — no substring, no fuzzy, only known equivalents */
const SYNONYM_GROUPS: Record<string, string[]> = {
  "从不": ["从未", "完全没有", "几乎没有", "从不发生", "绝不", "none", "never"],
  "很少": ["偶尔", "基本没有", "极少", "rarely", "seldom"],
  "有时": ["偶尔发生", "有时候", "间或", "sometimes", "occasionally"],
  "经常": ["时常", "常常", "频繁", "经常发生", "often", "frequently"],
  "总是": ["一直", "始终", "每次", "总是发生", "always", "every time"],
  "非常不同意": ["完全不同意", "强烈不同意", "strongly disagree"],
  "不同意": ["比较不同意", "disagree", "somewhat disagree"],
  "中立": ["一般", "不确定", "neutral", "neither", "无意见"],
  "同意": ["比较同意", "agree", "somewhat agree"],
  "非常同意": ["完全同意", "强烈同意", "strongly agree"],
};

function buildSynonymMap(mapping: Record<string, number>): Map<string, number> {
  const map = new Map<string, number>();
  for (const [canonical, synonyms] of Object.entries(SYNONYM_GROUPS)) {
    if (mapping[canonical] !== undefined) {
      for (const syn of synonyms) {
        map.set(syn.toLowerCase(), mapping[canonical]);
      }
    }
  }
  return map;
}

function tryMatch(raw: string, mapping: Record<string, number>, synonymMap: Map<string, number>): { value: number; method: MappingMethod; confidence: number } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // L1: Exact match
  if (mapping[trimmed] !== undefined) {
    return { value: mapping[trimmed], method: "exact", confidence: 1.0 };
  }

  // L2: Case-insensitive exact
  const lowerRaw = trimmed.toLowerCase();
  for (const label of Object.keys(mapping)) {
    if (label.toLowerCase() === lowerRaw) {
      return { value: mapping[label], method: "case_insensitive", confidence: 0.95 };
    }
  }

  // L3: Dictionary synonym (predefined groups only — no substring)
  const synVal = synonymMap.get(lowerRaw);
  if (synVal !== undefined) {
    return { value: synVal, method: "synonym_dict", confidence: 0.92 };
  }

  // L4: Numeric — raw value is already a number
  const numVal = Number(trimmed);
  if (!isNaN(numVal)) {
    const knownValues = Object.values(mapping);
    if (knownValues.includes(numVal)) {
      return { value: numVal, method: "numeric", confidence: 0.7 };
    }
    // Numeric but not in mapping — return as-is with lower confidence
    return { value: numVal, method: "numeric", confidence: 0.5 };
  }

  return null;
}

/** Apply codebook mapping to all columns that have codebook entries */
export function applyMapping(
  rows: Record<string, unknown>[],
  codebook: CodebookSchema,
  headers: string[]
): MappingFreeze {
  const matrix: number[][] = [];
  const log: MappingLogEntry[][] = [];

  let totalCells = 0;
  let mappedCells = 0;
  let exactMatches = 0;
  let synonymMatches = 0;
  let numericMatches = 0;
  let unmappedCells = 0;
  let reverseTransformed = 0;

  // Pre-build synonym maps per question (one map per question)
  const synonymMaps = new Map<string, Map<string, number>>();
  for (const col of headers) {
    const q = codebook.questions[col];
    if (q) {
      synonymMaps.set(col, buildSynonymMap(q.mapping));
    }
  }

  for (let r = 0; r < rows.length; r++) {
    const rowVec: number[] = [];
    const rowLog: MappingLogEntry[] = [];

    for (const col of headers) {
      const raw = String(rows[r][col] ?? "").trim();
      const question = codebook.questions[col];

      if (question) {
        totalCells++;
        const result = tryMatch(raw, question.mapping, synonymMaps.get(col)!);

        if (result) {
          let finalValue = result.value;

          // Apply reverse transform in mapping layer
          if (question.reverse) {
            const vals = Object.values(question.mapping).filter((v) => !isNaN(v));
            if (vals.length >= 2) {
              const maxVal = Math.max(...vals);
              const minVal = Math.min(...vals);
              finalValue = maxVal + minVal - result.value;
              reverseTransformed++;
            }
          }

          rowVec.push(finalValue);
          mappedCells++;
          if (result.method === "exact") exactMatches++;
          else if (result.method === "synonym_dict") synonymMatches++;
          else numericMatches++;

          rowLog.push({
            raw,
            mapped: finalValue,
            method: result.method,
            confidence: result.confidence,
            reversed: question.reverse,
          });
        } else {
          rowVec.push(NaN);
          unmappedCells++;
          rowLog.push({
            raw,
            mapped: null,
            method: "unmapped",
            confidence: 0,
            reversed: false,
          });
        }
      } else {
        // No codebook entry — pass through as numeric
        const num = Number(raw);
        rowVec.push(isNaN(num) ? NaN : num);
        rowLog.push({
          raw,
          mapped: isNaN(num) ? null : num,
          method: "numeric",
          confidence: isNaN(num) ? 0 : 0.5,
          reversed: false,
        });
      }
    }

    matrix.push(rowVec);
    log.push(rowLog);
  }

  const confidence = totalCells > 0 ? mappedCells / totalCells : 1;

  const stats: MappingFreezeStats = {
    totalCells,
    mappedCells,
    exactMatches,
    synonymMatches,
    numericMatches,
    unmappedCells,
    confidence,
    reverseTransformed,
  };

  console.log("[mapping-engine] MappingFreeze created:", stats);

  return {
    matrix,
    headers,
    log,
    stats,
    appliedAt: Date.now(),
    codebookSource: codebook.source,
  };
}

/** Extract only likert columns from a frozen matrix */
export function extractLikertFromFreeze(
  freeze: MappingFreeze,
  likertColumns: string[]
): number[][] {
  const colIndices = likertColumns
    .map((col) => freeze.headers.indexOf(col))
    .filter((i) => i >= 0);

  return freeze.matrix.map((row) => colIndices.map((i) => row[i]));
}
