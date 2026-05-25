// ============================================================
// Layer 1: Diagnostic Engine
// Runs BEFORE any statistical analysis
// Outputs structured diagnostic JSON
// ============================================================

import type { AnalysisResults, ColumnInfo } from "@/types";

export interface DiagnosticReport {
  dataQuality: {
    missingRate: number;
    missingLabel: "low" | "moderate" | "high";
    sampleSize: number;
    sampleAdequacy: "adequate" | "marginal" | "insufficient";
    normality: string;
  };
  scaleHealth: {
    reliabilityStatus: "good" | "acceptable" | "low" | "not_applicable";
    cronbachsAlpha: number;
    problemItems: string[];
  };
  validity: {
    kmo: number;
    kmoLabel: string;
    bartlett: string;
    factorability: "good" | "acceptable" | "poor" | "not_applicable";
  };
  analysisPermissions: {
    allowed: string[];
    blocked: string[];
    warnings: string[];
  };
  recommendations: Array<{
    issue: string;
    severity: "warning" | "info";
    suggestion: string;
  }>;
  confidence: number;
}

export function runDiagnostics(
  columns: ColumnInfo[],
  results: AnalysisResults | null
): DiagnosticReport {
  const report: DiagnosticReport = {
    dataQuality: assessDataQuality(columns),
    scaleHealth: assessScaleHealth(results),
    validity: assessValidity(results),
    analysisPermissions: { allowed: [], blocked: [], warnings: [] },
    recommendations: [],
    confidence: 0,
  };

  // Compute permissions
  computePermissions(report, columns, results);

  // Compute overall confidence
  report.confidence = computeConfidence(report);

  return report;
}

function assessDataQuality(columns: ColumnInfo[]): DiagnosticReport["dataQuality"] {
  if (columns.length === 0) {
    return {
      missingRate: 0,
      missingLabel: "low",
      sampleSize: 0,
      sampleAdequacy: "insufficient",
      normality: "No data available.",
    };
  }

  let totalMissing = 0;
  let totalCells = 0;
  for (const col of columns) {
    totalMissing += col.missingCount;
    totalCells += col.uniqueValues + col.missingCount;
  }

  const missingRate = totalCells > 0 ? totalMissing / totalCells : 0;
  const missingLabel = missingRate < 0.05 ? "low" : missingRate < 0.15 ? "moderate" : "high";

  const sampleSize = columns[0]?.uniqueValues > 0
    ? Math.max(...columns.map((c) => c.uniqueValues + c.missingCount))
    : 0;
  const sampleAdequacy =
    sampleSize >= 200 ? "adequate" : sampleSize >= 100 ? "marginal" : "insufficient";

  const likertCols = columns.filter((c) => c.type === "likert");
  const normality =
    likertCols.length > 0
      ? `${likertCols.length} Likert items detected. Normality test available after analysis.`
      : "No scale items detected. Normality check not applicable.";

  return { missingRate, missingLabel, sampleSize, sampleAdequacy, normality };
}

function assessScaleHealth(results: AnalysisResults | null): DiagnosticReport["scaleHealth"] {
  if (!results || results.reliability.cronbachsAlpha <= 0) {
    return {
      reliabilityStatus: "not_applicable",
      cronbachsAlpha: 0,
      problemItems: [],
    };
  }

  const alpha = results.reliability.cronbachsAlpha;
  const status = alpha >= 0.80 ? "good" : alpha >= 0.70 ? "acceptable" : "low";

  const problemItems: string[] = [];
  for (const [item, corr] of Object.entries(results.reliability.itemTotalCorrelation)) {
    if (corr < 0.3) problemItems.push(item);
  }
  for (const [item, alphaIfDel] of Object.entries(results.reliability.alphaIfItemDeleted)) {
    if (alphaIfDel !== null && alphaIfDel - alpha > 0.05) {
      if (!problemItems.includes(item)) problemItems.push(item);
    }
  }

  return {
    reliabilityStatus: status,
    cronbachsAlpha: alpha,
    problemItems: problemItems.slice(0, 10),
  };
}

function assessValidity(results: AnalysisResults | null): DiagnosticReport["validity"] {
  if (!results || results.validity.kmo <= 0) {
    return {
      kmo: 0,
      kmoLabel: "N/A",
      bartlett: "Not available.",
      factorability: "not_applicable",
    };
  }

  const kmo = results.validity.kmo;
  const kmoLabel =
    kmo >= 0.90 ? "marvelous" : kmo >= 0.80 ? "meritorious" : kmo >= 0.70 ? "middling" : kmo >= 0.60 ? "mediocre" : "unacceptable";

  const bartlett =
    results.validity.bartlettPValue < 0.001
      ? "Significant, p < .001"
      : results.validity.bartlettPValue < 0.05
        ? `Significant, p = ${results.validity.bartlettPValue.toFixed(3)}`
        : `Not significant, p = ${results.validity.bartlettPValue.toFixed(3)}`;

  const factorability =
    kmo >= 0.80 ? "good" : kmo >= 0.60 ? "acceptable" : "poor";

  return { kmo, kmoLabel, bartlett, factorability };
}

function computePermissions(
  report: DiagnosticReport,
  columns: ColumnInfo[],
  results: AnalysisResults | null
): void {
  const allowed: string[] = [];
  const blocked: string[] = [];
  const warnings: string[] = [];

  const likertCols = columns.filter((c) => c.type === "likert");
  const hasScaleData = likertCols.length >= 3;
  const hasAdequateSample = report.dataQuality.sampleAdequacy !== "insufficient";

  // Descriptive — always allowed
  allowed.push("descriptive");

  // Correlation — needs at least 2 numeric columns
  const numericCols = columns.filter((c) => c.type === "likert" || c.type === "numeric");
  if (numericCols.length >= 2) {
    allowed.push("correlation");
    if (numericCols.length > 15) {
      warnings.push("Many numeric variables — consider grouping or dimension reduction.");
    }
  } else {
    blocked.push("correlation");
  }

  // Reliability — needs scale data
  if (hasScaleData) {
    allowed.push("reliability");
  } else {
    blocked.push("reliability");
  }

  // Validity — needs scale data + adequate sample
  if (hasScaleData && hasAdequateSample) {
    allowed.push("validity");
  } else if (hasScaleData && !hasAdequateSample) {
    warnings.push(`Sample size (N=${report.dataQuality.sampleSize}) may be insufficient for KMO.`);
    allowed.push("validity");
  } else {
    blocked.push("validity");
  }

  // EFA — needs reliability + validity
  if (results && results.reliability.cronbachsAlpha >= 0.70 && results.validity.kmo >= 0.60) {
    allowed.push("efa");
  } else if (results && results.validity.kmo > 0 && results.validity.kmo < 0.60) {
    blocked.push("efa");
    warnings.push("KMO below 0.60 — factor analysis may not be appropriate.");
  } else {
    allowed.push("efa"); // Allow tentatively, will be validated after analysis
  }

  // Stability — always allowed if analysis was run
  if (results) {
    allowed.push("stability");
  }

  // Regression — needs numeric outcome + at least 2 predictors
  if (numericCols.length >= 3) {
    allowed.push("regression");
  } else {
    blocked.push("regression");
  }

  // Group tests — needs categorical column (not yet detected, placeholder)
  const hasCategorical = columns.some((c) => c.type === "text" && c.uniqueValues <= 10);
  if (hasCategorical) {
    allowed.push("group_comparison");
  }

  // Missing rate warning
  if (report.dataQuality.missingRate > 0.10) {
    report.recommendations.push({
      issue: `Missing data rate: ${(report.dataQuality.missingRate * 100).toFixed(1)}%`,
      severity: "warning",
      suggestion: "Consider imputation methods or listwise deletion with caution.",
    });
  }

  // Sample size warning
  if (!hasAdequateSample) {
    report.recommendations.push({
      issue: `Small sample size (N=${report.dataQuality.sampleSize})`,
      severity: "warning",
      suggestion: "Results should be interpreted cautiously. Bootstrap or non-parametric methods recommended.",
    });
  }

  // Reliability warnings
  if (report.scaleHealth.cronbachsAlpha > 0 && report.scaleHealth.cronbachsAlpha < 0.70) {
    report.recommendations.push({
      issue: `Low reliability (α = ${report.scaleHealth.cronbachsAlpha.toFixed(2)})`,
      severity: "warning",
      suggestion: "Review item quality. Consider removing items with low item-total correlations.",
    });
  }

  report.analysisPermissions = { allowed, blocked, warnings };
}

function computeConfidence(report: DiagnosticReport): number {
  let score = 0;
  const total = 4;

  if (report.dataQuality.sampleAdequacy === "adequate") score++;
  else if (report.dataQuality.sampleAdequacy === "marginal") score += 0.5;

  if (report.dataQuality.missingRate < 0.05) score++;
  else if (report.dataQuality.missingRate < 0.15) score += 0.5;

  if (report.scaleHealth.reliabilityStatus === "good") score++;
  else if (report.scaleHealth.reliabilityStatus === "acceptable") score += 0.5;

  if (report.validity.factorability === "good") score++;
  else if (report.validity.factorability === "acceptable") score += 0.5;

  return Math.round((score / total) * 100);
}
