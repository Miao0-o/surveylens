// ============================================================
// Module 1: Diagnostic Engine — Readiness Auditor
// Answers: "Is this questionnaire data ready for analysis?"
// ============================================================

import type { AnalysisResults, ColumnInfo } from "@/types";

export interface DiagnosticReport {
  data_quality: {
    score: number;
    missing: string;
    missing_pct: number;
    imbalance: string;
    distribution_risk: string;
  };
  scale_quality: {
    score: number;
    cronbach_alpha: number;
    problem_items: string[];
    reverse_item_risk: string[];
  };
  factorability: {
    score: number;
    kmo: number;
    kmo_interpretation: string;
    bartlett: string;
    bartlett_interpretation: string;
    readiness: string;
    risk_level: string;
    summary: string;
  };
  technical_risk: {
    score: number;
    level: string;
    flags: string[];
  };
  readiness: {
    score: number;
    level: "ready" | "partial" | "low" | "not_ready";
    label: string;
    descriptive: boolean;
    correlation: boolean;
    regression: boolean;
    factor_analysis: boolean;
  };
  risk_flags: Array<{ type: "error" | "warning" | "info"; source: string; message: string }>;
  recommendations: Array<{ issue: string; fix: string }>;
}

export function runDiagnostics(
  columns: ColumnInfo[],
  results: AnalysisResults | null
): DiagnosticReport {
  const likertCols = columns.filter((c) => c.type === "likert");
  const numericCols = columns.filter((c) => c.type === "likert" || c.type === "numeric");
  const totalMissing = columns.reduce((s, c) => s + c.missingCount, 0);
  const totalCells = columns.reduce((s, c) => s + c.uniqueValues + c.missingCount, 0);
  const missingRate = totalCells > 0 ? totalMissing / totalCells : 0;
  const sampleSize = columns.length > 0
    ? Math.max(...columns.map((c) => c.uniqueValues + c.missingCount))
    : 0;

  const alpha = results?.reliability.cronbachsAlpha ?? 0;
  const kmo = results?.validity.kmo ?? 0;
  const bartlettP = results?.validity.bartlettPValue ?? 1;

  // ==========================================
  // 1. Scale Quality (40%)
  // ==========================================
  let scaleScore = 0;
  if (alpha > 0) {
    if (alpha >= 0.90) scaleScore = 100;
    else if (alpha >= 0.80) scaleScore = 85;
    else if (alpha >= 0.70) scaleScore = 70;
    else if (alpha >= 0.60) scaleScore = 50;
    else scaleScore = 25;

    // Item penalties
    if (results) {
      let penaltyCount = 0;
      for (const [, corr] of Object.entries(results.reliability.itemTotalCorrelation)) {
        if (corr < 0.3 && corr >= 0) penaltyCount++;
        if (corr < 0) penaltyCount += 2; // reverse item = double penalty
      }
      scaleScore = Math.max(0, scaleScore - penaltyCount * 5);
    }
  }

  const problemItems: string[] = [];
  const reverseRisks: string[] = [];
  if (results && alpha > 0) {
    for (const [item, corr] of Object.entries(results.reliability.itemTotalCorrelation)) {
      if (corr < 0.3 && corr >= 0) problemItems.push(item);
      if (corr < 0) reverseRisks.push(item);
    }
  }

  // ==========================================
  // 2. Data Quality (30%)
  // ==========================================
  let missingScore = 100;
  if (missingRate <= 0.05) missingScore = 100;
  else if (missingRate <= 0.15) missingScore = 80;
  else if (missingRate <= 0.30) missingScore = 60;
  else missingScore = 30;

  const hasCategorical = columns.some((c) => c.type === "text" && c.uniqueValues <= 10);
  let imbalanceScore = 100;
  let imbalanceLabel = "Continuous only";
  if (hasCategorical) {
    const catCols = columns.filter((c) => c.type === "text" && c.uniqueValues <= 10);
    const maxRatio = Math.max(...catCols.map((c) => c.uniqueValues)) / Math.max(1, Math.min(...catCols.map((c) => c.uniqueValues)));
    if (maxRatio < 2) { imbalanceScore = 100; imbalanceLabel = "Balanced"; }
    else if (maxRatio < 5) { imbalanceScore = 70; imbalanceLabel = "Moderate imbalance"; }
    else { imbalanceScore = 40; imbalanceLabel = "Severe imbalance"; }
  }

  let distScore = 100;
  let distLabel = "Normal (scale data)";
  if (likertCols.length === 0) { distScore = 50; distLabel = "No scale items — cannot assess normality"; }
  else if (columns.some((c) => c.type === "numeric" && (c.max ?? 0) - (c.min ?? 0) > 100)) {
    distScore = 70; distLabel = "Mild skew possible";
  }

  const dataQualityScore = Math.round(missingScore * 0.5 + imbalanceScore * 0.25 + distScore * 0.25);

  // ==========================================
  // 3. Factorability Assessment (20%)
  // ==========================================
  const kmoInterpretation =
    kmo >= 0.90 ? "Excellent" : kmo >= 0.80 ? "Good" : kmo >= 0.70 ? "Acceptable" : kmo >= 0.60 ? "Marginal" : kmo >= 0.50 ? "Weak" : "Unsuitable";
  const bartlettInterpretation =
    bartlettP < 0.05 ? "Significant inter-item correlations — suitable for factor analysis" : "Not significant — variables may not be suitable for factor analysis";
  const factorReadiness =
    kmo >= 0.80 ? "Good — factor analysis appropriate" : kmo >= 0.60 ? "Marginal — results may be unstable; interpret cautiously" : kmo > 0 ? "Poor — factor analysis not recommended" : "Not yet assessed";
  const factorRisk =
    kmo >= 0.80 ? "low" : kmo >= 0.60 ? "moderate" : kmo > 0 ? "high" : "unknown";
  const factorSummary =
    kmo > 0
      ? `KMO = ${kmo.toFixed(3)} (${kmoInterpretation.toLowerCase()}). ${bartlettInterpretation}. ${factorReadiness}.`
      : "Factorability not yet assessed — run validity analysis first.";

  let kmoScore = 25;
  if (kmo > 0) {
    if (kmo >= 0.90) kmoScore = 100;
    else if (kmo >= 0.80) kmoScore = 85;
    else if (kmo >= 0.70) kmoScore = 70;
    else if (kmo >= 0.60) kmoScore = 50;
    else if (kmo >= 0.50) kmoScore = 30;
    else kmoScore = 15;
  }
  if (kmo > 0 && bartlettP < 0.05) kmoScore = Math.min(100, kmoScore + 15);
  if (kmo > 0 && bartlettP >= 0.05) kmoScore = Math.max(0, kmoScore - 15);
  const factorabilityScore = kmoScore;

  // ==========================================
  // 4. Technical Risk (10%)
  // ==========================================
  let techRiskScore = 100;
  const techFlags: string[] = [];
  if (sampleSize < 30) { techRiskScore = 40; techFlags.push("Sample too small (N<30)"); }
  else if (sampleSize < 100) { techRiskScore = 70; techFlags.push("Small sample (N<100)"); }
  if (missingRate > 0.15) { techRiskScore = Math.min(techRiskScore, 60); techFlags.push("High missing rate"); }
  if (reverseRisks.length > 2) { techRiskScore = Math.min(techRiskScore, 60); techFlags.push("Multiple reverse-coded item risks"); }
  if (hasCategorical && imbalanceLabel.includes("Severe")) { techRiskScore = Math.min(techRiskScore, 50); techFlags.push("Severe group imbalance"); }

  // ==========================================
  // FINAL READINESS SCORE
  // ==========================================
  const readinessScore = Math.round(
    0.40 * scaleScore +
    0.30 * dataQualityScore +
    0.20 * factorabilityScore +
    0.10 * techRiskScore
  );

  const readinessLevel =
    readinessScore >= 80 ? "ready" : readinessScore >= 60 ? "partial" : readinessScore >= 40 ? "low" : "not_ready";

  const levelLabels: Record<string, string> = {
    ready: "Ready for full analysis",
    partial: "Partially ready — descriptive + correlation OK, regression with caution",
    low: "Low readiness — descriptive only, results may be unstable",
    not_ready: "Not ready — do not run inferential statistics",
  };

  const hasScale = likertCols.length >= 3;
  const hasAdequateN = sampleSize >= 100;
  const readiness = {
    score: readinessScore,
    level: readinessLevel as "ready" | "partial" | "low" | "not_ready",
    label: levelLabels[readinessLevel],
    descriptive: columns.length > 0,
    correlation: numericCols.length >= 2,
    regression: numericCols.length >= 3 && hasAdequateN && readinessLevel !== "not_ready",
    factor_analysis: hasScale && kmo >= 0.50 && hasAdequateN && readinessLevel !== "not_ready",
  };

  // Risk flags
  const riskFlags: DiagnosticReport["risk_flags"] = [];
  if (missingRate >= 0.10) riskFlags.push({ type: "warning", source: "data_quality", message: `Missing rate ${(missingRate*100).toFixed(0)}% — consider imputation.` });
  if (sampleSize < 100) riskFlags.push({ type: "warning", source: "data_quality", message: `Small sample (N=${sampleSize}). Results may be unstable.` });
  if (sampleSize < 30) riskFlags.push({ type: "error", source: "data_quality", message: `N=${sampleSize} too small for reliable inference.` });
  if (alpha > 0 && alpha < 0.70) riskFlags.push({ type: "warning", source: "scale_quality", message: `Low reliability (α=${alpha.toFixed(2)}). Review items.` });
  if (alpha > 0.95) riskFlags.push({ type: "info", source: "scale_quality", message: `Very high α (${alpha.toFixed(2)}) — possible item redundancy.` });
  if (reverseRisks.length > 0) riskFlags.push({ type: "warning", source: "scale_quality", message: `${reverseRisks.length} items with negative item-total r — possible reverse coding.` });
  if (kmo > 0 && kmo < 0.60) riskFlags.push({ type: "error", source: "validity", message: `KMO=${kmo.toFixed(2)} — factor analysis not appropriate.` });
  if (kmo > 0 && bartlettP >= 0.05) riskFlags.push({ type: "warning", source: "validity", message: `Bartlett not significant — correlation matrix may be identity.` });

  // Recommendations
  const recs: DiagnosticReport["recommendations"] = [];
  if (missingRate >= 0.10) recs.push({ issue: `Missing: ${(missingRate*100).toFixed(0)}%`, fix: "Apply imputation or listwise deletion." });
  if (sampleSize < 100) recs.push({ issue: `N=${sampleSize} (small)`, fix: "Use bootstrap. Triangulate with other samples." });
  if (alpha > 0 && alpha < 0.70) recs.push({ issue: `Low α (${alpha.toFixed(2)})`, fix: "Remove weak items and re-test reliability." });
  if (reverseRisks.length > 0) recs.push({ issue: `${reverseRisks.length} reverse-coded items`, fix: "Verify coding. Reverse-score if confirmed." });
  if (kmo > 0 && kmo < 0.60) recs.push({ issue: `KMO too low (${kmo.toFixed(2)})`, fix: "Collect more data or remove problematic items." });

  const bartlettLabel = kmo > 0
    ? (bartlettP < 0.001 ? "Significant, p < .001" : `p = ${bartlettP.toFixed(3)}`)
    : "Not yet assessed";

  const factorabilityLabel = kmo >= 0.80 ? "good" : kmo >= 0.60 ? "acceptable" : kmo > 0 ? "poor" : "not yet assessed";

  return {
    data_quality: {
      score: dataQualityScore,
      missing: missingRate < 0.05 ? "low" : missingRate < 0.15 ? "moderate" : "high",
      missing_pct: Math.round(missingRate * 100),
      imbalance: imbalanceLabel,
      distribution_risk: distLabel,
    },
    scale_quality: {
      score: scaleScore,
      cronbach_alpha: alpha,
      problem_items: problemItems.slice(0, 10),
      reverse_item_risk: reverseRisks.slice(0, 10),
    },
    factorability: {
      score: factorabilityScore,
      kmo,
      kmo_interpretation: kmoInterpretation,
      bartlett: bartlettLabel,
      bartlett_interpretation: bartlettInterpretation,
      readiness: factorReadiness,
      risk_level: factorRisk,
      summary: factorSummary,
    },
    technical_risk: {
      score: techRiskScore,
      level: techRiskScore >= 80 ? "low" : techRiskScore >= 60 ? "moderate" : "high",
      flags: techFlags,
    },
    readiness,
    risk_flags: riskFlags,
    recommendations: recs,
  };
}
