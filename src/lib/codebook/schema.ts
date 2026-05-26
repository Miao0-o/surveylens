// ============================================================
// Codebook Schema — structured mapping definition
// ============================================================

export interface CodebookQuestion {
  id: string;
  text: string;
  mapping: Record<string, number>;
  reverse: boolean;
  /** Which way the scale runs: 1→max (正向) or max→1 (反向) */
  direction: "forward" | "reverse" | "unknown";
}

export interface CodebookSchema {
  questions: Record<string, CodebookQuestion>;
  source: string;
  sourceType: "csv" | "json" | "spss" | "manual";
  detectedReverseItems: string[];
}

export interface CodebookMappingResult {
  /** Final numeric matrix */
  matrix: number[][];
  /** Original headers */
  headers: string[];
  /** Items that couldn't be mapped */
  unmapped: Array<{ row: number; col: string; value: string }>;
  /** Confidence of mapping (0-1) */
  confidence: number;
  /** Applied codebook */
  codebook: CodebookSchema;
}

export function createEmptyCodebook(): CodebookSchema {
  return {
    questions: {},
    source: "",
    sourceType: "manual",
    detectedReverseItems: [],
  };
}

// ---- Mapping Freeze Layer ----

export type MappingMethod = "exact" | "case_insensitive" | "synonym_dict" | "numeric" | "unmapped";

export interface MappingLogEntry {
  raw: string;
  mapped: number | null;
  method: MappingMethod;
  confidence: number;
  reversed: boolean;
}

export interface MappingFreezeStats {
  totalCells: number;
  mappedCells: number;
  exactMatches: number;
  synonymMatches: number;
  numericMatches: number;
  unmappedCells: number;
  confidence: number;
  reverseTransformed: number;
}

export interface MappingFreeze {
  matrix: number[][];
  headers: string[];
  log: MappingLogEntry[][];
  stats: MappingFreezeStats;
  appliedAt: number;
  codebookSource: string;
}
