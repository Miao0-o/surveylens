// ============================================================
// Data Understanding Layer — Pre-Analysis Classification
// Classifies columns BEFORE Pyodide runs to determine which
// statistical methods are appropriate.
// ============================================================

import type { ColumnInfo, ParsedData } from "@/types";

export type ColumnClass = "item_scale" | "metadata" | "unknown";

export type DatasetType =
  | "item_scale_only"    // pure Likert/scale items → reliability + EFA
  | "metadata_only"      // demographics/aggregates → descriptive only
  | "mixed"              // has both → split analysis
  | "insufficient";      // too few usable columns

export interface ClassificationResult {
  datasetType: DatasetType;
  columns: { name: string; class: ColumnClass; reason: string }[];
  itemColumns: string[];
  metadataColumns: string[];
  canRunReliability: boolean;
  canRunEFA: boolean;
  warnings: string[];
}

/**
 * Classify each column and determine the overall dataset type.
 * Runs entirely in JS — no Pyodide needed.
 */
export function classifyDataset(columns: ColumnInfo[], data: ParsedData): ClassificationResult {
  const result: ClassificationResult = {
    datasetType: "insufficient",
    columns: [],
    itemColumns: [],
    metadataColumns: [],
    canRunReliability: false,
    canRunEFA: false,
    warnings: [],
  };

  if (columns.length === 0) {
    result.warnings.push("数据集中未检测到任何列。");
    return result;
  }

  // Step 1: Classify each column
  for (const col of columns) {
    const classification = classifyColumn(col, data);
    result.columns.push({ name: col.name, ...classification });
    if (classification.class === "item_scale") {
      result.itemColumns.push(col.name);
    } else if (classification.class === "metadata") {
      result.metadataColumns.push(col.name);
    }
  }

  // Step 2: Determine dataset type
  const totalCols = columns.length;
  const itemCount = result.itemColumns.length;
  const metadataCount = result.metadataColumns.length;
  const itemRatio = itemCount / totalCols;

  if (itemCount >= 3 && metadataCount === 0) {
    result.datasetType = "item_scale_only";
    result.canRunReliability = true;
    result.canRunEFA = itemCount >= 5;
  } else if (itemCount === 0 && metadataCount > 0) {
    result.datasetType = "metadata_only";
    result.canRunReliability = false;
    result.canRunEFA = false;
    result.warnings.push(
      "当前数据集不包含 Likert 量表题项，无法进行 Cronbach's α 信度分析。将仅提供描述性统计与相关矩阵分析。"
    );
  } else if (itemCount >= 1 && metadataCount >= 1) {
    result.datasetType = "mixed";
    if (itemCount >= 3) {
      result.canRunReliability = true;
      result.canRunEFA = itemCount >= 5;
      result.warnings.push(
        `数据集中包含 ${metadataCount} 个非量表列（如人口学变量、汇总分），将自动排除，仅对 ${itemCount} 个量表题项进行信效度分析。`
      );
    } else {
      result.canRunReliability = false;
      result.canRunEFA = false;
      result.warnings.push(
        `量表题项不足（仅 ${itemCount} 个），至少需要 3 个 Likert 题项才能进行信度分析。`
      );
    }
  } else if (itemCount < 3 && itemCount > 0) {
    result.datasetType = "insufficient";
    result.warnings.push(
      `量表题项不足（仅 ${itemCount} 个），至少需要 3 个 Likert 题项才能进行信度分析。`
    );
  } else {
    result.datasetType = "insufficient";
    result.warnings.push("无法确定数据类型，请检查数据格式。");
  }

  return result;
}

/**
 * Classify a single column.
 */
function classifyColumn(
  col: ColumnInfo,
  data: ParsedData
): { class: ColumnClass; reason: string } {
  // Already classified as Likert by the preprocessing engine
  if (col.type === "likert") {
    return { class: "item_scale", reason: "Likert 量表题（2-7 级数值）" };
  }

  // Text columns → metadata
  if (col.type === "text") {
    return { class: "metadata", reason: "文本/分类变量" };
  }

  // ID columns → metadata
  if (col.type === "id") {
    return { class: "metadata", reason: "ID 标识列" };
  }

  // Numeric columns — need deeper analysis
  if (col.type === "numeric" && col.min !== undefined && col.max !== undefined) {
    const range = col.max - col.min;

    // Very wide range with many unique values → likely a total/summary score
    if (col.uniqueValues > 15 && range > 7) {
      // Check if this looks like a summary score (sum of Likert items)
      // Heuristic: if range is roughly proportional to the number of unique values
      if (range > 20) {
        return { class: "metadata", reason: "连续/汇总变量（范围过大，非量表题项）" };
      }
    }

    // Moderate range, many values → could be continuous demographic (age, income)
    if (range > 10 && col.uniqueValues > 20) {
      return { class: "metadata", reason: "连续变量（范围与唯一值过多）" };
    }

    // Low range (<=7) but not caught as Likert → could be binary or small-range
    if (range <= 7 && col.uniqueValues <= 7) {
      return { class: "item_scale", reason: "低范围数值题项（疑似量表但未自动识别为 Likert）" };
    }

    // Catch-all for ambiguous numeric
    return { class: "unknown", reason: "数值列但无法确定类型" };
  }

  // Default
  return { class: "unknown", reason: "无法分类" };
}

/**
 * Determine if Cronbach's alpha is statistically meaningful for these columns.
 * Returns null if it IS appropriate, or a string reason if it's NOT.
 */
export function validateReliabilityApplicability(classResult: ClassificationResult): string | null {
  if (classResult.itemColumns.length < 3) {
    return "量表题项不足（至少需要 3 个 Likert 题项）。当前数据集不适用于内部一致性信度分析。";
  }
  return null; // OK to proceed
}
