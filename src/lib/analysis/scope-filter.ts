// ============================================================
// Analysis Scope Filter
// Restricts analysis to user-selected variables only.
// Automatically excludes known metadata/system columns.
// ============================================================

import type { ColumnInfo } from "@/types";
import { parseCompositeLabel } from "@/lib/stats/composite";

/** Known metadata/system column patterns from Qualtrics, SurveyMonkey, etc. */
const METADATA_PATTERNS = [
  /^recipient/i, /^external/i, /^ip\s*address/i, /^location/i,
  /^start\s*date/i, /^end\s*date/i, /^status$/i, /^progress$/i,
  /^duration/i, /^finished$/i, /^recorded\s*date/i, /^response\s*id/i,
  /^user\s*language/i, /^distribution\s*channel/i, /^consent/i,
  /^id$/i, /^\s*id\s*$/i,
];

/** Check if a column name matches known metadata patterns */
export function isMetadataColumn(colName: string): boolean {
  return METADATA_PATTERNS.some((p) => p.test(colName));
}

export interface AnalysisScope {
  compositeNames: string[];
  scopeItemNames: Set<string>;   // source items of composites + selected raw vars
  excludedColumns: string[];     // auto-excluded metadata columns
  hasUserSelection: boolean;
}

/**
 * Build the analysis scope from user's research design.
 * When no composites exist, scope = all non-metadata likert/numeric columns.
 */
export function buildAnalysisScope(
  columns: ColumnInfo[],
  design: { outcomeVariables?: string[]; predictorVariables?: string[] } | null
): AnalysisScope {
  const allVars = [...(design?.outcomeVariables ?? []), ...(design?.predictorVariables ?? [])];
  const hasUserSelection = allVars.length > 0;

  const scopeItemNames = new Set<string>();
  const compositeNames: string[] = [];
  const excludedColumns: string[] = [];

  if (hasUserSelection) {
    for (const v of allVars) {
      const composite = parseCompositeLabel(v);
      if (composite) {
        compositeNames.push(composite.label);
        for (const item of composite.sourceItems) {
          scopeItemNames.add(item);
        }
      } else {
        // Raw variable directly selected
        scopeItemNames.add(v);
      }
    }
    // Auto-exclude known metadata columns NOT in scope
    for (const col of columns) {
      if (isMetadataColumn(col.name) && !scopeItemNames.has(col.name)) {
        excludedColumns.push(col.name);
      }
    }
  } else {
    // No user selection: scope = all non-metadata likert/numeric
    for (const col of columns) {
      if (col.type === "likert" || col.type === "numeric") {
        if (isMetadataColumn(col.name)) {
          excludedColumns.push(col.name);
        } else {
          scopeItemNames.add(col.name);
        }
      } else if (isMetadataColumn(col.name)) {
        excludedColumns.push(col.name);
      }
    }
  }

  return { compositeNames, scopeItemNames, excludedColumns, hasUserSelection };
}

/**
 * Filter columns to only those within the analysis scope.
 */
export function filterColumnsToScope(columns: ColumnInfo[], scope: AnalysisScope): ColumnInfo[] {
  if (!scope.hasUserSelection && scope.scopeItemNames.size === 0) return columns;
  return columns.filter((c) => scope.scopeItemNames.has(c.name));
}

/**
 * Compute missing rate over scoped columns only.
 */
export function scopedMissingRate(columns: ColumnInfo[], scope: AnalysisScope): number {
  const scoped = columns.filter((c) => scope.scopeItemNames.has(c.name));
  if (scoped.length === 0) return 0;
  const totalMiss = scoped.reduce((s, c) => s + c.missingCount, 0);
  const totalCells = scoped.reduce((s, c) => s + c.uniqueValues + c.missingCount, 0);
  return totalCells > 0 ? totalMiss / totalCells : 0;
}
