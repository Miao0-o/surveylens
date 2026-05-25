// ============================================================
// Layer 1: Diagnostic Engine
// Runs BEFORE any statistical analysis
// Outputs structured diagnostic JSON
// ============================================================

import type { AnalysisResults, ColumnInfo } from "@/types";

export interface DiagnosticReport {
  data_quality: {
    missing_rate: number;
    imbalance: string;
    normality: string;
    sample_size: number;
    sample_adequacy: "adequate" | "marginal" | "insufficient";
  };
  scale_health: {
    cronbach_alpha: number;
    reliability_status: "good" | "acceptable" | "low" | "not_applicable";
    problem_items: string[];
  };
  validity: {
    kmo: number;
    bartlett: string;
    factorability: "good" | "acceptable" | "poor" | "not_applicable";
  };
  risk_flags: Array<{
    type: "error" | "warning" | "info";
    source: string;
    message: string;
  }>;
  allowed_analysis: string[];
  blocked_analysis: string[];
  recommendations: Array<{
    issue: string;
    severity: "warning" | "info";
    fix: string;
  }>;
  confidence: number;
}

export function runDiagnostics(
  columns: ColumnInfo[],
  results: AnalysisResults | null
): DiagnosticReport {
  const dq = assessDataQuality(columns);
  const sh = assessScaleHealth(results);
  const v = assessValidity(results);

  const report: DiagnosticReport = {
    data_quality: dq,
    scale_health: sh,
    validity: v,
    risk_flags: [],
    allowed_analysis: [],
    blocked_analysis: [],
    recommendations: [],
    confidence: 0,
  };

  computePermissions(report, columns, results);
  report.confidence = computeConfidence(report);

  return report;
}

function assessDataQuality(columns: ColumnInfo[]): DiagnosticReport["data_quality"] {
  if (columns.length === 0) {
    return { missing_rate: 0, imbalance: "N/A", normality: "No data.", sample_size: 0, sample_adequacy: "insufficient" };
  }
  let totalMissing = 0, totalCells = 0;
  for (const col of columns) {
    totalMissing += col.missingCount;
    totalCells += col.uniqueValues + col.missingCount;
  }
  const missing_rate = totalCells > 0 ? totalMissing / totalCells : 0;
  const sample_size = Math.max(...columns.map((c) => c.uniqueValues + c.missingCount));
  const sample_adequacy = sample_size >= 200 ? "adequate" : sample_size >= 100 ? "marginal" : "insufficient";
  const likertCols = columns.filter((c) => c.type === "likert");
  const normality = likertCols.length > 0 ? `${likertCols.length} Likert items.` : "No scale items.";
  const imbalance = columns.some(c => c.type === "text" && c.uniqueValues <= 10) ? "Has categorical groups" : "Continuous only";
  return { missing_rate, imbalance, normality, sample_size, sample_adequacy };
}

function assessScaleHealth(results: AnalysisResults | null): DiagnosticReport["scale_health"] {
  if (!results || results.reliability.cronbachsAlpha <= 0) {
    return { cronbach_alpha: 0, reliability_status: "not_applicable", problem_items: [] };
  }
  const alpha = results.reliability.cronbachsAlpha;
  const status = alpha >= 0.80 ? "good" : alpha >= 0.70 ? "acceptable" : "low";
  const problemItems: string[] = [];
  for (const [item, corr] of Object.entries(results.reliability.itemTotalCorrelation)) {
    if (corr < 0.3) problemItems.push(item);
  }
  for (const [item, aid] of Object.entries(results.reliability.alphaIfItemDeleted)) {
    if (aid !== null && aid - alpha > 0.05 && !problemItems.includes(item)) problemItems.push(item);
  }
  return { cronbach_alpha: alpha, reliability_status: status, problem_items: problemItems.slice(0, 10) };
}

function assessValidity(results: AnalysisResults | null): DiagnosticReport["validity"] {
  if (!results || results.validity.kmo <= 0) {
    return { kmo: 0, bartlett: "N/A", factorability: "not_applicable" };
  }
  const kmo = results.validity.kmo;
  const bartlett = results.validity.bartlettPValue < 0.001
    ? "Significant, p < .001" : results.validity.bartlettPValue < 0.05
    ? `Significant, p = ${results.validity.bartlettPValue.toFixed(3)}`
    : `Not significant, p = ${results.validity.bartlettPValue.toFixed(3)}`;
  const factorability = kmo >= 0.80 ? "good" : kmo >= 0.60 ? "acceptable" : "poor";
  return { kmo, bartlett, factorability };
}

function computePermissions(
  report: DiagnosticReport,
  columns: ColumnInfo[],
  results: AnalysisResults | null
): void {
  const allowed: string[] = ["descriptive"];
  const blocked: string[] = [];

  const likertCols = columns.filter((c) => c.type === "likert");
  const hasScaleData = likertCols.length >= 3;
  const hasAdequateSample = report.data_quality.sample_adequacy !== "insufficient";
  const numericCols = columns.filter((c) => c.type === "likert" || c.type === "numeric");

  if (numericCols.length >= 2) allowed.push("correlation");
  else blocked.push("correlation");

  if (hasScaleData) allowed.push("reliability");
  else blocked.push("reliability");

  if (hasScaleData) {
    allowed.push("validity");
    if (!hasAdequateSample) report.risk_flags.push({
      type: "warning", source: "validity",
      message: `Sample size may be insufficient for KMO (N=${report.data_quality.sample_size}).`
    });
  } else {
    blocked.push("validity");
  }

  if (results && results.validity.kmo > 0 && results.validity.kmo < 0.60) {
    blocked.push("efa");
    report.risk_flags.push({
      type: "error", source: "validity",
      message: "KMO below 0.60 — factor analysis may not be appropriate."
    });
  } else {
    allowed.push("efa");
  }

  if (results) allowed.push("stability");
  if (numericCols.length >= 3) allowed.push("regression");
  else blocked.push("regression");

  const hasCategorical = columns.some((c) => c.type === "text" && c.uniqueValues <= 10);
  if (hasCategorical) allowed.push("group_comparison");

  if (report.data_quality.missing_rate > 0.10) {
    report.recommendations.push({
      issue: `Missing rate: ${(report.data_quality.missing_rate * 100).toFixed(1)}%`,
      severity: "warning",
      fix: "Consider imputation or listwise deletion with caution.",
    });
  }

  if (!hasAdequateSample) {
    report.recommendations.push({
      issue: `Small sample (N=${report.data_quality.sample_size})`,
      severity: "warning",
      fix: "Use bootstrap or non-parametric methods. Interpret with caution.",
    });
  }

  if (report.scale_health.cronbach_alpha > 0 && report.scale_health.cronbach_alpha < 0.70) {
    report.recommendations.push({
      issue: `Low reliability (α = ${report.scale_health.cronbach_alpha.toFixed(2)})`,
      severity: "warning",
      fix: "Review and remove items with low item-total correlations.",
    });
  }

  report.allowed_analysis = allowed;
  report.blocked_analysis = blocked;
}

function computeConfidence(report: DiagnosticReport): number {
  let score = 0; const total = 4;
  if (report.data_quality.sample_adequacy === "adequate") score++;
  else if (report.data_quality.sample_adequacy === "marginal") score += 0.5;
  if (report.data_quality.missing_rate < 0.05) score++;
  else if (report.data_quality.missing_rate < 0.15) score += 0.5;
  if (report.scale_health.reliability_status === "good") score++;
  else if (report.scale_health.reliability_status === "acceptable") score += 0.5;
  if (report.validity.factorability === "good") score++;
  else if (report.validity.factorability === "acceptable") score += 0.5;
  return Math.round((score / total) * 100);
}
