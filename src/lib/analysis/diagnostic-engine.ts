// ============================================================
// Module 1: Diagnostic Engine — Readiness Auditor
// Answers: "Is this questionnaire data ready for analysis?"
// ============================================================

import type { AnalysisResults, ColumnInfo } from "@/types";

export interface DiagnosticReport {
  data_quality: {
    score: number;
    missing_data: {
      rate: number;
      interpretation: string;
      risk_level: "low" | "medium" | "high";
    };
    response_distribution: {
      status: string;
      interpretation: string;
      risk_level: "low" | "medium" | "high";
    };
    response_variability: {
      status: string;
      interpretation: string;
      risk_level: "low" | "medium" | "high";
    };
    overall: {
      risk_level: "low" | "medium" | "high";
      summary: string;
    };
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
  results: AnalysisResults | null,
  lang: "zh" | "en" = "zh"
): DiagnosticReport {
  const en = lang === "en";
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
  if (likertCols.length === 0) { distScore = 50; }
  else if (columns.some((c) => c.type === "numeric" && (c.max ?? 0) - (c.min ?? 0) > 100)) {
    distScore = 70;
  }

  const dataQualityScore = Math.round(missingScore * 0.5 + imbalanceScore * 0.25 + distScore * 0.25);

  // ==========================================
  // 3. Factorability Assessment (20%)
  // ==========================================
  const kmoInterpretation = en
    ? (kmo >= 0.90 ? "Excellent" : kmo >= 0.80 ? "Good" : kmo >= 0.70 ? "Acceptable" : kmo >= 0.60 ? "Marginal" : kmo >= 0.50 ? "Weak" : "Unsuitable")
    : (kmo >= 0.90 ? "极佳" : kmo >= 0.80 ? "良好" : kmo >= 0.70 ? "可接受" : kmo >= 0.60 ? "勉强" : kmo >= 0.50 ? "较弱" : "不适合");
  const bartlettInterpretation = en
    ? (bartlettP < 0.05 ? "Significant inter-item correlations — suitable for factor analysis" : "Not significant — variables may not be suitable for factor analysis")
    : (bartlettP < 0.05 ? "题项间相关显著 — 适合进行因子分析" : "不显著 — 变量可能不适合因子分析");
  const factorReadiness = en
    ? (kmo >= 0.80 ? "Good — factor analysis appropriate" : kmo >= 0.60 ? "Marginal — results may be unstable; interpret cautiously" : kmo > 0 ? "Poor — factor analysis not recommended" : "Not yet assessed")
    : (kmo >= 0.80 ? "良好 — 适合因子分析" : kmo >= 0.60 ? "勉强 — 结果可能不稳定" : kmo > 0 ? "较差 — 不建议因子分析" : "尚未评估");
  const factorRisk = kmo >= 0.80 ? "low" : kmo >= 0.60 ? "moderate" : kmo > 0 ? "high" : "unknown";
  const factorSummary = kmo > 0
    ? `KMO = ${kmo.toFixed(3)} (${kmoInterpretation.toLowerCase()}). ${bartlettInterpretation}. ${factorReadiness}.`
    : (en ? "Factorability not yet assessed." : "尚未评估因子分析适配性。");

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

  const levelLabels: Record<string, string> = en ? {
    ready: "Ready for full analysis",
    partial: "Partially ready — descriptive + correlation OK",
    low: "Low readiness — descriptive only, results may be unstable",
    not_ready: "Not ready — do not run inferential statistics",
  } : {
    ready: "就绪 — 可进行全部分析",
    partial: "部分就绪 — 描述+相关可用，回归需谨慎",
    low: "准备度偏低 — 仅描述统计，结果可能不稳定",
    not_ready: "未就绪 — 请勿运行推断性统计",
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
  if (missingRate >= 0.10) riskFlags.push({ type: "warning", source: "data_quality", message: en ? `Missing rate ${(missingRate*100).toFixed(0)}% — consider imputation.` : `缺失率 ${(missingRate*100).toFixed(0)}% — 建议插补处理。` });
  if (sampleSize < 100) riskFlags.push({ type: "warning", source: "data_quality", message: en ? `Small sample (N=${sampleSize}). Results may be unstable.` : `样本量较小 (N=${sampleSize})，结果可能不稳定。` });
  if (sampleSize < 30) riskFlags.push({ type: "error", source: "data_quality", message: en ? `N=${sampleSize} too small for reliable inference.` : `N=${sampleSize} 过小，无法进行可靠推断。` });
  if (alpha > 0 && alpha < 0.70) riskFlags.push({ type: "warning", source: "scale_quality", message: en ? `Low reliability (α=${alpha.toFixed(2)}). Review items.` : `信度偏低 (α=${alpha.toFixed(2)})，请检查题项。` });
  if (alpha > 0.95) riskFlags.push({ type: "info", source: "scale_quality", message: en ? `Very high α (${alpha.toFixed(2)}) — possible item redundancy.` : `α 极高 (${alpha.toFixed(2)}) — 可能存在题项冗余。` });
  if (reverseRisks.length > 0) riskFlags.push({ type: "warning", source: "scale_quality", message: en ? `${reverseRisks.length} possible reverse-coded items detected.` : `检测到 ${reverseRisks.length} 个可能为反向计分的题项。` });
  if (kmo > 0 && kmo < 0.60) riskFlags.push({ type: "error", source: "validity", message: en ? `KMO=${kmo.toFixed(2)} — factor analysis not appropriate.` : `KMO=${kmo.toFixed(2)} — 不适合因子分析。` });
  if (kmo > 0 && bartlettP >= 0.05) riskFlags.push({ type: "warning", source: "validity", message: en ? `Bartlett not significant — correlation matrix may be identity.` : `Bartlett 不显著 — 相关矩阵可能接近单位矩阵。` });

  // Recommendations
  const recs: DiagnosticReport["recommendations"] = [];
  if (missingRate >= 0.10) recs.push({ issue: en ? `Missing: ${(missingRate*100).toFixed(0)}%` : `缺失: ${(missingRate*100).toFixed(0)}%`, fix: en ? "Apply imputation or listwise deletion." : "应用插补法或整行删除处理。" });
  if (sampleSize < 100) recs.push({ issue: en ? `N=${sampleSize} (small)` : `N=${sampleSize} (偏小)`, fix: en ? "Use bootstrap. Triangulate with other samples." : "使用 Bootstrap 方法，结合其他样本交叉验证。" });
  if (alpha > 0 && alpha < 0.70) recs.push({ issue: en ? `Low α (${alpha.toFixed(2)})` : `α 偏低 (${alpha.toFixed(2)})`, fix: en ? "Remove weak items and re-test reliability." : "删除弱题项并重新测试信度。" });
  if (reverseRisks.length > 0) recs.push({ issue: en ? `${reverseRisks.length} reverse-coded items` : `${reverseRisks.length} 个反向计分题项`, fix: en ? "Verify coding. Reverse-score if confirmed." : "核实计分方向，确认后重新编码并重跑。" });
  if (kmo > 0 && kmo < 0.60) recs.push({ issue: en ? `KMO too low (${kmo.toFixed(2)})` : `KMO 过低 (${kmo.toFixed(2)})`, fix: en ? "Collect more data or remove problematic items." : "增加样本量或删除问题题项。" });

  const bartlettLabel = kmo > 0
    ? (bartlettP < 0.001 ? "Significant, p < .001" : `p = ${bartlettP.toFixed(3)}`)
    : "Not yet assessed";

  const factorabilityLabel = kmo >= 0.80 ? "good" : kmo >= 0.60 ? "acceptable" : kmo > 0 ? "poor" : "not yet assessed";

  return {
    data_quality: {
      score: dataQualityScore,
      missing_data: {
        rate: Math.round(missingRate * 100),
        interpretation: en
          ? (missingRate < 0.05 ? "Excellent — negligible missing data." : missingRate < 0.15 ? "Acceptable — minor missing data present." : "Problematic — missing data may bias results.")
          : (missingRate < 0.05 ? "优秀 — 缺失数据可忽略。" : missingRate < 0.15 ? "可接受 — 存在少量缺失数据。" : "需关注 — 缺失数据可能影响结果。"),
        risk_level: missingRate < 0.05 ? "low" : missingRate < 0.15 ? "medium" : "high",
      },
      response_distribution: {
        status: imbalanceLabel,
        interpretation: en
          ? (imbalanceLabel === "Balanced" ? "Response distribution is balanced, no strong response bias." : imbalanceLabel.includes("Moderate") ? "Mild imbalance — may slightly affect stability." : "Severe imbalance — group comparisons may be unreliable.")
          : (imbalanceLabel === "Balanced" ? "响应分布均衡，无明显回答偏差。" : imbalanceLabel.includes("Moderate") ? "轻度不均衡 — 可能轻微影响统计稳定性。" : "严重不均衡 — 组间比较可能不可靠。"),
        risk_level: imbalanceLabel === "Balanced" ? "low" : imbalanceLabel.includes("Moderate") ? "medium" : "high",
      },
      response_variability: computeVariability(columns, en),
      overall: {
        risk_level: dataQualityScore >= 80 ? "low" : dataQualityScore >= 60 ? "medium" : "high",
        summary: en
          ? (dataQualityScore >= 80 ? "Data is clean and ready for analysis." : dataQualityScore >= 60 ? "Data is usable but has minor quality concerns." : "Data has quality issues — interpret with caution.")
          : (dataQualityScore >= 80 ? "数据干净，可直接进行统计分析。" : dataQualityScore >= 60 ? "数据可用，但存在轻微质量问题。" : "数据存在质量问题 — 解读需谨慎。"),
      },
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

function computeVariability(columns: ColumnInfo[], en: boolean): {
  status: string;
  interpretation: string;
  risk_level: "low" | "medium" | "high";
} {
  const likertCols = columns.filter((c) => c.type === "likert");
  if (likertCols.length === 0) {
    return {
      status: en ? "Cannot assess" : "无法评估",
      interpretation: en ? "No scale items available for variability check." : "无可用量表题项进行变异性检查。",
      risk_level: "medium",
    };
  }

  const lowVarItems = likertCols.filter((c) => {
    if (c.min === undefined || c.max === undefined || c.mean === undefined) return false;
    return (c.max - c.min) <= 1;
  });

  if (lowVarItems.length > likertCols.length * 0.3) {
    return {
      status: en ? "Low variability" : "低变异性",
      interpretation: en
        ? `${lowVarItems.length} items show very low response variability — possible straight-lining.`
        : `${lowVarItems.length} 个题项响应变异性极低 — 可能存在直线作答或随意填答。`,
      risk_level: "high",
    };
  }

  if (lowVarItems.length > 0) {
    return {
      status: en ? "Minor concern" : "轻微问题",
      interpretation: en
        ? `${lowVarItems.length} items show limited variability — may indicate response bias.`
        : `${lowVarItems.length} 个题项变异性有限 — 可能存在回答定势偏差。`,
      risk_level: "medium",
    };
  }

  return {
    status: en ? "Adequate" : "变异性充分",
    interpretation: en
      ? "Response variability is adequate across all items."
      : "各题项响应变异性充分，表明填答质量良好。",
    risk_level: "low",
  };
}
