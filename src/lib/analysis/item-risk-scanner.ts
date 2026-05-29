// ============================================================
// Problematic Items Scanner — aggregates item-level risks
// from multiple sources into a unified risk dashboard.
// ============================================================

import type { AnalysisResults, ColumnInfo } from "@/types";

export type RiskSeverity = "critical" | "high" | "moderate" | "low";

export interface ItemRisk {
  item: string;
  scale?: string;            // which composite/scale the item belongs to
  severity: RiskSeverity;
  sources: RiskSource[];
  score: number;              // 0–100, higher = more problematic
}

export interface RiskSource {
  type: "low_item_total" | "alpha_improvement" | "cross_loading" | "high_missing" | "reverse_coded";
  label: string;
  detail: string;
}

export interface RiskReport {
  items: ItemRisk[];
  totalRisky: number;
  criticalCount: number;
  highCount: number;
  topItem?: ItemRisk;
}

export function scanItemRisks(
  results: AnalysisResults,
  columns: ColumnInfo[],
  composites: { label: string; sourceItems: string[] }[],
  en: boolean
): RiskReport {
  const itemRisks = new Map<string, ItemRisk>();

  const ensure = (item: string): ItemRisk => {
    if (!itemRisks.has(item)) {
      itemRisks.set(item, { item, severity: "low", sources: [], score: 0 });
    }
    return itemRisks.get(item)!;
  };

  const addRisk = (item: string, source: RiskSource, weight: number) => {
    const r = ensure(item);
    r.sources.push(source);
    r.score += weight;
  };

  // ---- 1. Low item-total correlation (r < .20) ----
  for (const [item, corr] of Object.entries(results.reliability.itemTotalCorrelation)) {
    if (corr < 0.20) {
      const sev: RiskSeverity = corr < 0 ? "critical" : corr < 0.10 ? "high" : "moderate";
      addRisk(item, {
        type: "low_item_total",
        label: en ? "Low item-total correlation" : "题总相关偏低",
        detail: en ? `r = ${corr.toFixed(2)}` : `r = ${corr.toFixed(2)}`,
      }, corr < 0 ? 40 : corr < 0.10 ? 30 : 20);
    }
  }

  // ---- 2. Alpha-if-deleted improvement > .05 ----
  const baseAlpha = results.reliability.cronbachsAlpha;
  for (const [item, alphaIfDel] of Object.entries(results.reliability.alphaIfItemDeleted)) {
    if (alphaIfDel !== null && alphaIfDel - baseAlpha > 0.05) {
      const improvement = alphaIfDel - baseAlpha;
      addRisk(item, {
        type: "alpha_improvement",
        label: en ? "Alpha improves if removed" : "删除后 α 提升",
        detail: en ? `+${improvement.toFixed(2)} (α → ${alphaIfDel.toFixed(2)})` : `+${improvement.toFixed(2)} (α → ${alphaIfDel.toFixed(2)})`,
      }, Math.min(30, Math.round(improvement * 100)));
    }
  }

  // ---- 3. Cross-loading (item loads on multiple factors) ----
  if (results.efa.loadings.length > 0) {
    for (let i = 0; i < results.efa.loadings.length; i++) {
      const row = results.efa.loadings[i];
      const item = results.efa.itemLabels[i] ?? `Item_${i}`;
      const sorted = row.map((l, f) => ({ loading: Math.abs(l), factor: f + 1 }))
        .sort((a, b) => b.loading - a.loading);
      // Cross-loading: top two loadings both >= .30 AND difference < .20
      if (sorted.length >= 2 && sorted[0].loading >= 0.30 && sorted[1].loading >= 0.30
        && sorted[0].loading - sorted[1].loading < 0.20) {
        addRisk(item, {
          type: "cross_loading",
          label: en ? "Cross-loading detected" : "交叉载荷",
          detail: en
            ? `F${sorted[0].factor}=${sorted[0].loading.toFixed(2)}, F${sorted[1].factor}=${sorted[1].loading.toFixed(2)}`
            : `因子${sorted[0].factor}=${sorted[0].loading.toFixed(2)}, 因子${sorted[1].factor}=${sorted[1].loading.toFixed(2)}`,
        }, 25);
      }
    }
  }

  // ---- 4. High missing rate (> 20%) ----
  for (const col of columns) {
    const totalCells = col.uniqueValues + col.missingCount;
    const rate = totalCells > 0 ? col.missingCount / totalCells : 0;
    if (rate > 0.20) {
      addRisk(col.name, {
        type: "high_missing",
        label: en ? "High missing rate" : "缺失率偏高",
        detail: en ? `${(rate * 100).toFixed(0)}%` : `${(rate * 100).toFixed(0)}%`,
      }, rate > 0.50 ? 35 : 20);
    }
  }

  // ---- 5. Reverse-coded detection ----
  for (const [item, corr] of Object.entries(results.reliability.itemTotalCorrelation)) {
    if (corr < 0) {
      // Add reverse-coding risk but avoid duplicating the low_item_total label
      const existing = ensure(item);
      if (!existing.sources.some(s => s.type === "reverse_coded")) {
        addRisk(item, {
          type: "reverse_coded",
          label: en ? "Possible reverse-coding" : "可能反向计分",
          detail: en ? `Item-total r = ${corr.toFixed(2)}` : `题总相关 = ${corr.toFixed(2)}`,
        }, 30);
      }
    }
  }

  // ---- Assign scales and finalize severity ----
  const scaleMap = new Map<string, string>();
  for (const c of composites) {
    for (const item of c.sourceItems) {
      scaleMap.set(item, c.label);
    }
  }

  const items = Array.from(itemRisks.values()).map(r => {
    r.scale = scaleMap.get(r.item);
    // Severity from score
    if (r.score >= 60) r.severity = "critical";
    else if (r.score >= 40) r.severity = "high";
    else if (r.score >= 20) r.severity = "moderate";
    else r.severity = "low";
    return r;
  }).sort((a, b) => b.score - a.score);

  return {
    items,
    totalRisky: items.length,
    criticalCount: items.filter(r => r.severity === "critical").length,
    highCount: items.filter(r => r.severity === "high").length,
    topItem: items[0],
  };
}
