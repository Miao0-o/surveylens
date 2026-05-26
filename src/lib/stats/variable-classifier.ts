// ============================================================
// Variable Semantic Classifier
// Layer 1: Semantic Type → Layer 2: Potential Eligibility → Layer 3: Statistical Validation
// ============================================================

import type { ColumnInfo, VariableMeta, SemanticType, AnalysisEligibility } from "@/types";
import type { CodebookSchema } from "@/lib/codebook/schema";

function detectRawType(col: ColumnInfo): "string" | "number" | "mixed" {
  if (col.type === "numeric" || col.type === "likert") return "number";
  if (col.type === "text") return "string";
  if (col.min !== undefined && col.max !== undefined) return "mixed";
  return "string";
}

function detectSemanticType(col: ColumnInfo, codebook: CodebookSchema | null): SemanticType {
  if (codebook?.questions[col.name]) return "likert";
  switch (col.type) {
    case "likert": return "likert";
    case "numeric": return "numeric";
    case "id": return "metadata";
    case "text":
      if (col.uniqueValues <= 20 && col.uniqueValues > 0) return "categorical";
      return "text";
    case "unknown":
      if (col.uniqueValues <= 20 && col.uniqueValues > 0) return "categorical";
      if (col.min !== undefined && col.max !== undefined) return "numeric";
      return "text";
    default: return "text";
  }
}

function detectMappingStatus(col: ColumnInfo, codebook: CodebookSchema | null): "mapped" | "raw" | "failed" {
  return codebook?.questions[col.name] ? "mapped" : "raw";
}

function computeEligibility(semanticType: SemanticType): AnalysisEligibility {
  switch (semanticType) {
    case "likert":
      return { reliability: "eligible", efa: "eligible", correlation: "eligible", regression: "eligible", descriptive: "eligible" };
    case "numeric":
      // Numeric can potentially be used, but needs statistical validation
      return { reliability: "unavailable", efa: "potentially", correlation: "eligible", regression: "eligible", descriptive: "eligible" };
    case "categorical":
      return { reliability: "unavailable", efa: "unavailable", correlation: "unavailable", regression: "potentially", descriptive: "eligible" };
    case "metadata":
      return { reliability: "unavailable", efa: "unavailable", correlation: "unavailable", regression: "unavailable", descriptive: "unavailable" };
    case "text":
      return { reliability: "unavailable", efa: "unavailable", correlation: "unavailable", regression: "unavailable", descriptive: "eligible" };
  }
}

function buildReason(semanticType: SemanticType): string {
  switch (semanticType) {
    case "likert": return "适合信效度分析及因子分析";
    case "numeric": return "可用于相关、回归；信度需Likert量表；因子分析需通过KMO检验";
    case "categorical": return "可用于分组回归；不适合信度或因子分析";
    case "metadata": return "元数据列，不参与心理测量分析";
    case "text": return "仅支持基础文本摘要，不参与统计分析";
  }
}

export function classifyVariable(col: ColumnInfo, codebook: CodebookSchema | null): VariableMeta {
  const semanticType = detectSemanticType(col, codebook);
  return {
    name: col.name,
    rawType: detectRawType(col),
    semanticType,
    mappingStatus: detectMappingStatus(col, codebook),
    eligibleAnalyses: computeEligibility(semanticType),
    eligibilityReason: buildReason(semanticType),
  };
}

export function classifyAll(
  columns: ColumnInfo[],
  headers: string[],
  codebook: CodebookSchema | null
): Map<string, VariableMeta> {
  const map = new Map<string, VariableMeta>();
  const colMap = new Map(columns.map((c) => [c.name, c]));
  for (const h of headers) {
    const col = colMap.get(h);
    if (col) {
      map.set(h, classifyVariable(col, codebook));
    } else {
      map.set(h, {
        name: h, rawType: "string", semanticType: "text", mappingStatus: "raw",
        eligibleAnalyses: { reliability: "unavailable", efa: "unavailable", correlation: "unavailable", regression: "unavailable", descriptive: "eligible" },
        eligibilityReason: "未分类列，仅支持基础文本摘要",
      });
    }
  }
  return map;
}

// ---- Type badges ----

const TYPE_BADGES: Record<SemanticType, { zh: string; en: string; color: string; tooltip_zh: string; tooltip_en: string }> = {
  likert: {
    zh: "Likert", en: "Likert", color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    tooltip_zh: "适合信度分析、效度检验与因子分析",
    tooltip_en: "Suitable for reliability and factor analysis",
  },
  numeric: {
    zh: "数值", en: "Numeric", color: "bg-blue-50 text-blue-600 border-blue-100",
    tooltip_zh: "可用于相关与回归；因子分析需通过KMO检验",
    tooltip_en: "Usable for correlation and regression; EFA requires KMO validation",
  },
  categorical: {
    zh: "分类", en: "Categorical", color: "bg-purple-50 text-purple-600 border-purple-100",
    tooltip_zh: "可用于分组回归；不适合信度或因子分析",
    tooltip_en: "Usable for group regression; not suitable for reliability or EFA",
  },
  metadata: {
    zh: "元数据", en: "Metadata", color: "bg-gray-100 text-gray-500 border-gray-200",
    tooltip_zh: "元数据列不参与心理测量分析",
    tooltip_en: "Metadata columns are excluded from psychometric analyses",
  },
  text: {
    zh: "文本", en: "Text", color: "bg-gray-100 text-gray-500 border-gray-200",
    tooltip_zh: "仅支持文本摘要，不参与统计分析",
    tooltip_en: "Basic text summary only; excluded from statistical analyses",
  },
};

export function getTypeBadge(semanticType: SemanticType, lang: "zh" | "en" = "zh"): { label: string; color: string; tooltip: string } {
  const b = TYPE_BADGES[semanticType];
  return { label: lang === "en" ? b.en : b.zh, color: b.color, tooltip: lang === "en" ? b.tooltip_en : b.tooltip_zh };
}

// ---- Analysis availability matrix ----

export function computeAnalysisAvailability(
  selectedCols: string[],
  varMeta: Map<string, VariableMeta>
): Record<string, { available: boolean; reason: string }> {
  const metas = selectedCols.map((c) => varMeta.get(c)).filter(Boolean) as VariableMeta[];

  const hasLikert = metas.some((m) => m.semanticType === "likert");
  const hasNumeric = metas.some((m) => m.semanticType === "likert" || m.semanticType === "numeric");
  const hasTwoPlus = metas.length >= 2;

  return {
    reliability: {
      available: hasLikert,
      reason: hasLikert ? "✓ Likert item(s) selected" : "Requires Likert-scale items",
    },
    efa: {
      available: hasLikert && hasTwoPlus,
      reason: hasLikert && hasTwoPlus ? "✓ Sufficient Likert items" : hasLikert ? "Need ≥ 2 Likert items" : "Requires Likert-scale items",
    },
    correlation: {
      available: hasNumeric && hasTwoPlus,
      reason: hasNumeric && hasTwoPlus ? "✓ ≥ 2 numeric variables" : "Need ≥ 2 numeric variables",
    },
    regression: {
      available: hasNumeric && hasTwoPlus,
      reason: hasNumeric && hasTwoPlus ? "✓ Variables available" : "Need ≥ 2 variables",
    },
    descriptive: {
      available: metas.length > 0,
      reason: metas.length > 0 ? "✓ Variables available" : "Select at least one variable",
    },
  };
}
