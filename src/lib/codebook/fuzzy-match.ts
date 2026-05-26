// ============================================================
// Fuzzy Matcher — Safe mapping utilities (delegates to engine)
// Substring matching REMOVED. Use mapping-engine.ts for full pipeline.
// ============================================================

import { applyMapping } from "./mapping-engine";
import type { CodebookSchema, CodebookMappingResult } from "./schema";

export interface MatchResult {
  mapped: boolean;
  value: number | null;
  matchedTo: string | null;
  confidence: number;
}

/** Single-value safe match — L1 exact → L2 case-insensitive → L3 synonym only */
export function fuzzyMatch(rawValue: string, mapping: Record<string, number>): MatchResult {
  const trimmed = rawValue.trim();
  if (!trimmed) return { mapped: false, value: null, matchedTo: null, confidence: 0 };

  // L1: Exact match
  if (mapping[trimmed] !== undefined) {
    return { mapped: true, value: mapping[trimmed], matchedTo: trimmed, confidence: 1.0 };
  }

  // L2: Case-insensitive
  const lowerRaw = trimmed.toLowerCase();
  for (const label of Object.keys(mapping)) {
    if (label.toLowerCase() === lowerRaw) {
      return { mapped: true, value: mapping[label], matchedTo: label, confidence: 0.95 };
    }
  }

  // L3: Dictionary synonym (predefined groups only)
  const synonymGroups: Record<string, string[]> = {
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

  for (const [canonical, synonyms] of Object.entries(synonymGroups)) {
    if (synonyms.some((s) => s.toLowerCase() === lowerRaw)) {
      if (mapping[canonical] !== undefined) {
        return { mapped: true, value: mapping[canonical], matchedTo: canonical, confidence: 0.92 };
      }
    }
  }

  // L4: Numeric fallback
  const numVal = Number(trimmed);
  if (!isNaN(numVal)) {
    const knownValues = Object.values(mapping);
    if (knownValues.includes(numVal)) {
      return { mapped: true, value: numVal, matchedTo: String(numVal), confidence: 0.7 };
    }
    return { mapped: true, value: numVal, matchedTo: null, confidence: 0.5 };
  }

  return { mapped: false, value: null, matchedTo: null, confidence: 0 };
}

/** Apply codebook to raw data rows — delegates to mapping engine */
export function applyCodebook(
  rows: Record<string, unknown>[],
  codebook: CodebookSchema,
  headers: string[]
): CodebookMappingResult {
  const freeze = applyMapping(rows, codebook, headers);

  const unmapped: CodebookMappingResult["unmapped"] = [];
  for (let r = 0; r < freeze.log.length; r++) {
    for (let c = 0; c < freeze.log[r].length; c++) {
      const entry = freeze.log[r][c];
      if (entry.method === "unmapped") {
        unmapped.push({
          row: r,
          col: freeze.headers[c],
          value: entry.raw,
        });
      }
    }
  }

  return {
    matrix: freeze.matrix,
    headers,
    unmapped,
    confidence: freeze.stats.confidence,
    codebook,
  };
}
