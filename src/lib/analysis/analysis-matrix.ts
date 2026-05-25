// ============================================================
// Analysis Readiness Matrix Engine
// Evaluates whether each method is appropriate — no AI needed
// ============================================================

import type { DiagnosticReport } from "./diagnostic-engine";

export interface MethodStatus {
  status: "allowed" | "caution" | "not_allowed";
  icon: "green" | "yellow" | "red";
  reason: string;
}

export interface AnalysisMatrix {
  descriptive_statistics: MethodStatus;
  correlation_analysis: MethodStatus;
  regression_analysis: MethodStatus;
  factor_analysis: MethodStatus;
  overall_summary: {
    readiness_level: "high" | "medium" | "low";
    key_blockers: string[];
    recommendation: string;
  };
  confidence: number;
}

export function generateMatrix(report: DiagnosticReport, sampleSize: number): AnalysisMatrix {
  const dq = report.data_quality;
  const fa = report.factorability;
  const key_blockers: string[] = [];

  // Descriptive — always allowed
  const descriptive: MethodStatus = {
    status: "allowed", icon: "green",
    reason: "Descriptive statistics can always be computed. No prerequisites required.",
  };

  // Correlation
  let corrStatus = "allowed" as MethodStatus["status"];
  let corrReason = "";
  if (sampleSize < 20) {
    corrStatus = "not_allowed"; corrReason = "Sample too small (N < 20). Correlation estimates unreliable.";
    key_blockers.push("Sample too small for correlation.");
  } else if (dq.response_variability.risk_level === "high") {
    corrStatus = "caution"; corrReason = "Low variability may attenuate correlations. Interpret direction only.";
  } else {
    corrReason = "Numeric/Likert variables present with adequate variance.";
  }
  const correlation: MethodStatus = { status: corrStatus, icon: corrStatus === "allowed" ? "green" : corrStatus === "caution" ? "yellow" : "red", reason: corrReason };

  // Regression
  let regStatus = "allowed" as MethodStatus["status"];
  let regReason = "";
  if (sampleSize < 30) {
    regStatus = "not_allowed"; regReason = `N = ${sampleSize} too small. Minimum 30 recommended, 50+ preferred.`;
    key_blockers.push("Sample too small for regression.");
  } else if (sampleSize < 50) {
    regStatus = "caution"; regReason = `N = ${sampleSize} is marginal. Results may be unstable.`;
  } else {
    regReason = `Adequate sample (N = ${sampleSize}).`;
  }
  const regression: MethodStatus = { status: regStatus, icon: regStatus === "allowed" ? "green" : regStatus === "caution" ? "yellow" : "red", reason: regReason };

  // Factor Analysis
  let faStatus = "allowed" as MethodStatus["status"];
  let faReason = "";
  if (fa.kmo <= 0) {
    faStatus = "not_allowed"; faReason = "KMO not available — run validity analysis first.";
    key_blockers.push("Factor analysis prerequisites not met.");
  } else if (fa.kmo < 0.50) {
    faStatus = "not_allowed"; faReason = `KMO = ${fa.kmo.toFixed(2)} — unsuitable for factor analysis.`;
    key_blockers.push("KMO too low for factor analysis.");
  } else if (fa.kmo < 0.60) {
    faStatus = "caution"; faReason = `KMO = ${fa.kmo.toFixed(2)} is weak. Factor solution may be unstable.`;
  } else if (sampleSize < 200) {
    faStatus = "caution"; faReason = `KMO = ${fa.kmo.toFixed(2)} is adequate, but N = ${sampleSize} is below recommended 200.`;
  } else {
    faReason = `KMO = ${fa.kmo.toFixed(2)}, sample N = ${sampleSize} — suitable for factor analysis.`;
  }
  const factor: MethodStatus = { status: faStatus, icon: faStatus === "allowed" ? "green" : faStatus === "caution" ? "yellow" : "red", reason: faReason };

  // Overall
  const allowed = [descriptive, correlation, regression, factor].filter((m) => m.status === "allowed").length;
  const notAllowed = [descriptive, correlation, regression, factor].filter((m) => m.status === "not_allowed").length;
  const readinessLevel = notAllowed >= 2 ? "low" : notAllowed === 1 ? "medium" : "high";
  const recommendation = readinessLevel === "high"
    ? "All core analyses can proceed. Report results with standard caveats."
    : readinessLevel === "medium"
    ? "Some analyses are blocked or require caution. Review blockers before proceeding."
    : "Multiple analyses are blocked. Address data quality issues before further analysis.";

  return {
    descriptive_statistics: descriptive,
    correlation_analysis: correlation,
    regression_analysis: regression,
    factor_analysis: factor,
    overall_summary: { readiness_level: readinessLevel, key_blockers, recommendation },
    confidence: report.readiness.score / 100,
  };
}
