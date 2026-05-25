// ============================================================
// Layer 1: Diagnostic Engine — Data Quality & Readiness Auditor
// Role: evaluate whether questionnaire data is ready for analysis
// ============================================================

import type { AnalysisResults, ColumnInfo } from "@/types";

export interface DiagnosticReport {
  data_quality: {
    missing: string;
    imbalance: string;
    distribution_risk: string;
  };
  scale_quality: {
    cronbach_alpha: number;
    problem_items: string[];
    reverse_item_risk: string[];
  };
  validity: {
    kmo: number;
    bartlett: string;
    factorability: string;
  };
  readiness: {
    descriptive: boolean;
    correlation: boolean;
    regression: boolean;
    factor_analysis: boolean;
  };
  risk_flags: Array<{ type: "error" | "warning" | "info"; source: string; message: string }>;
  recommendations: Array<{ issue: string; fix: string }>;
  readiness_score: number;
  confidence: number;
}

export function runDiagnostics(columns: ColumnInfo[], results: AnalysisResults | null): DiagnosticReport {
  const likertCols = columns.filter((c) => c.type === "likert");
  const numericCols = columns.filter((c) => c.type === "likert" || c.type === "numeric");
  const totalMissing = columns.reduce((s, c) => s + c.missingCount, 0);
  const totalCells = columns.reduce((s, c) => s + c.uniqueValues + c.missingCount, 0);
  const missingRate = totalCells > 0 ? totalMissing / totalCells : 0;
  const sampleSize = columns.length > 0 ? Math.max(...columns.map((c) => c.uniqueValues + c.missingCount)) : 0;

  // Data Quality
  const dq = {
    missing: missingRate < 0.05 ? "low" : missingRate < 0.15 ? "moderate" : "high",
    imbalance: columns.some((c) => c.type === "text" && c.uniqueValues <= 10) ? "Has categorical groups" : "Continuous only",
    distribution_risk: likertCols.length === 0 ? "No scale items — cannot assess" : "Normality check available after descriptive analysis",
  };

  // Scale Quality
  const alpha = results?.reliability.cronbachsAlpha ?? 0;
  const problemItems: string[] = [];
  const reverseRisks: string[] = [];
  if (results && alpha > 0) {
    for (const [item, corr] of Object.entries(results.reliability.itemTotalCorrelation)) {
      if (corr < 0.3 && corr >= 0) problemItems.push(item);
      if (corr < 0) reverseRisks.push(item);
    }
  }

  const sq = {
    cronbach_alpha: alpha,
    problem_items: problemItems.slice(0, 10),
    reverse_item_risk: reverseRisks.slice(0, 10),
  };

  // Validity
  const kmo = results?.validity.kmo ?? 0;
  const bartlett = kmo > 0
    ? (results!.validity.bartlettPValue < 0.001 ? "Significant, p < .001" : `p = ${results!.validity.bartlettPValue.toFixed(3)}`)
    : "Not yet assessed";
  const factorability = kmo >= 0.80 ? "good" : kmo >= 0.60 ? "acceptable" : kmo > 0 ? "poor" : "not yet assessed";

  const v = { kmo, bartlett, factorability };

  // Readiness
  const hasScale = likertCols.length >= 3;
  const hasAdequateN = sampleSize >= 100;
  const readiness = {
    descriptive: columns.length > 0,
    correlation: numericCols.length >= 2,
    regression: numericCols.length >= 3 && hasAdequateN,
    factor_analysis: hasScale && kmo >= 0.60 && hasAdequateN,
  };

  // Risk flags
  const risk_flags: DiagnosticReport["risk_flags"] = [];
  if (missingRate >= 0.10) risk_flags.push({ type: "warning", source: "data_quality", message: `Missing rate ${(missingRate*100).toFixed(0)}% — consider imputation.` });
  if (sampleSize < 100) risk_flags.push({ type: "warning", source: "data_quality", message: `Small sample (N=${sampleSize}). Bootstrap recommended.` });
  if (sampleSize < 30) risk_flags.push({ type: "error", source: "data_quality", message: `N=${sampleSize} too small for reliable analysis.` });
  if (alpha > 0 && alpha < 0.70) risk_flags.push({ type: "warning", source: "scale_quality", message: `Low reliability (α=${alpha.toFixed(2)}).` });
  if (reverseRisks.length > 0) risk_flags.push({ type: "warning", source: "scale_quality", message: `${reverseRisks.length} items with negative item-total r — possible reverse coding.` });
  if (kmo > 0 && kmo < 0.60) risk_flags.push({ type: "error", source: "validity", message: `KMO=${kmo.toFixed(2)} — factor analysis not appropriate.` });

  // Recommendations
  const recommendations: DiagnosticReport["recommendations"] = [];
  if (missingRate >= 0.10) recommendations.push({ issue: `Missing data: ${(missingRate*100).toFixed(0)}%`, fix: "Apply imputation or use listwise deletion cautiously." });
  if (sampleSize < 100) recommendations.push({ issue: `Small sample (N=${sampleSize})`, fix: "Use bootstrap stability checks. Triangulate results." });
  if (alpha > 0 && alpha < 0.70) recommendations.push({ issue: `Scale reliability is low (α=${alpha.toFixed(2)})`, fix: "Review and remove problematic items before further analysis." });
  if (reverseRisks.length > 0) recommendations.push({ issue: `${reverseRisks.length} potential reverse-coded items`, fix: "Verify coding direction. Re-run reliability after correction." });

  // Scores
  let readinessScore = 0;
  if (readiness.descriptive) readinessScore += 25;
  if (readiness.correlation) readinessScore += 25;
  if (readiness.factor_analysis) readinessScore += 25;
  if (readiness.regression) readinessScore += 25;

  let confScore = 0; const total = 4;
  if (sampleSize >= 200) confScore++; else if (sampleSize >= 100) confScore += 0.5;
  if (missingRate < 0.05) confScore++; else if (missingRate < 0.15) confScore += 0.5;
  if (alpha >= 0.80) confScore++; else if (alpha >= 0.70) confScore += 0.5;
  if (kmo >= 0.80) confScore++; else if (kmo >= 0.60) confScore += 0.5;

  return {
    data_quality: dq,
    scale_quality: sq,
    validity: v,
    readiness,
    risk_flags,
    recommendations,
    readiness_score: readinessScore,
    confidence: Math.round((confScore / total) * 100),
  };
}
