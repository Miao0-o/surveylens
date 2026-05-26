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
    reason: string;
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
  recommendations: Array<{ recommendation: string; impact: string; strength: "强推荐" | "建议" | "可选"; action: string; issue: string }>;
  score_explanation: {
    why_this_score: string;
    stability_factors: string;
    uncertainty_notes: string;
  };
}

export function runDiagnostics(
  columns: ColumnInfo[],
  results: AnalysisResults | null,
  lang: "zh" | "en" = "zh",
  freezeStats?: { confidence: number; mappedCells: number; totalCells: number } | null
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

  const alpha = results?.reliability._meta.status === "ok" ? (results.reliability.cronbachsAlpha) : 0;
  const kmo = results?.validity._meta.status === "ok" ? (results.validity.kmo) : 0;
  const bartlettP = results?.validity.bartlettPValue ?? 1;

  // ==========================================
  // 1. Scale Quality (40%)
  // ==========================================
  let scaleScore = 0;
  let scaleReason = "";
  if (alpha > 0) {
    if (alpha >= 0.90) scaleScore = 100;
    else if (alpha >= 0.80) scaleScore = 85;
    else if (alpha >= 0.70) scaleScore = 70;
    else if (alpha >= 0.60) scaleScore = 50;
    else scaleScore = 25;

    // No item-level penalties — Cronbach's α alone is the scale quality indicator.
    // Reverse items, weak correlations etc. are detected separately.
    // The researcher makes item-level decisions.
  } else if (likertCols.length < 2) {
    scaleReason = en
      ? `Need ≥ 2 Likert items (found ${likertCols.length})`
      : `需要 ≥ 2 个 Likert 题项 (当前 ${likertCols.length} 个)`;
  } else if (results) {
    const analyzerCols = columns.filter(c => c.type === "numeric" || c.type === "likert");
    const textCols = columns.filter(c => c.type === "text" && c.uniqueValues <= 20);
    if (freezeStats && freezeStats.confidence > 0) {
      scaleReason = en
        ? `α = 0 — Codebook applied (${(freezeStats.confidence*100).toFixed(0)}% mapped, ${freezeStats.mappedCells}/${freezeStats.totalCells} cells). Check for constant responses or scale invariance.`
        : `α = 0 — 编码簿已应用 (${(freezeStats.confidence*100).toFixed(0)}% 已映射, ${freezeStats.mappedCells}/${freezeStats.totalCells} 单元格)。请检查是否存在固定应答或量表无变异。`;
    } else if (textCols.length > 0 && analyzerCols.length === 0) {
      scaleReason = en
        ? `α = 0 — Found ${textCols.length} text/categorical columns but no numeric items. Upload a codebook to map labels to values.`
        : `α = 0 — 发现 ${textCols.length} 个文本/分类列但无数值题项。请上传编码簿将文本标签映射为数值。`;
    } else {
      scaleReason = en
        ? `α = 0 — ${analyzerCols.length} items analyzed. Check for constant responses or insufficient variance.`
        : `α = 0 — 已分析 ${analyzerCols.length} 个题项。请检查是否存在固定应答或方差不足。`;
    }
  } else {
    scaleReason = en ? "Run analysis to compute α" : "请运行分析以计算 α";
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
    : (kmo >= 0.80 ? "良好 — 适合因子分析" : kmo >= 0.60 ? "勉强 — 结果可能不稳定" : kmo > 0 ? "较低 — 因子分析稳定性可能受限" : "尚未评估");
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
  if (missingRate >= 0.10) riskFlags.push({ type: "warning", source: "data_quality", message: en ? `Missing rate ${(missingRate*100).toFixed(0)}% — imputation may be considered.` : `缺失率 ${(missingRate*100).toFixed(0)}%，可考虑插补处理。` });
  if (sampleSize < 100) riskFlags.push({ type: "warning", source: "data_quality", message: en ? `Small sample (N=${sampleSize}). Results may be unstable.` : `样本量较小 (N=${sampleSize})，结果可能不稳定。` });
  if (sampleSize < 30) riskFlags.push({ type: "error", source: "data_quality", message: en ? `N=${sampleSize} too small for reliable inference.` : `N=${sampleSize} 过小，无法进行可靠推断。` });
  if (alpha > 0 && alpha < 0.70) riskFlags.push({ type: "warning", source: "scale_quality", message: en ? `Low reliability (α=${alpha.toFixed(2)}). Review items.` : `信度偏低 (α=${alpha.toFixed(2)})，请检查题项。` });
  if (alpha > 0.95) riskFlags.push({ type: "info", source: "scale_quality", message: en ? `Very high α (${alpha.toFixed(2)}) — possible item redundancy.` : `α 极高 (${alpha.toFixed(2)}) — 可能存在题项冗余。` });
  if (reverseRisks.length > 0) riskFlags.push({ type: "warning", source: "scale_quality", message: en ? `${reverseRisks.length} items may need direction verification.` : `检测到 ${reverseRisks.length} 个可能需要核实方向的题项。` });
  if (kmo > 0 && kmo < 0.60) riskFlags.push({ type: "error", source: "validity", message: en ? `KMO=${kmo.toFixed(2)} — factor analysis not appropriate.` : `KMO=${kmo.toFixed(2)} — 不适合因子分析。` });
  if (kmo > 0 && bartlettP >= 0.05) riskFlags.push({ type: "warning", source: "validity", message: en ? `Bartlett not significant — correlation matrix may be identity.` : `Bartlett 不显著 — 相关矩阵可能接近单位矩阵。` });

  // Recommendations — simple, actionable, decision-focused
  const recs: DiagnosticReport["recommendations"] = [];
  if (missingRate >= 0.10) recs.push({ issue: en ? `Missing: ${(missingRate*100).toFixed(0)}%` : `缺失: ${(missingRate*100).toFixed(0)}%`, recommendation: en ? "Review missing data patterns and consider imputation" : "检查缺失数据模式，可考虑插补处理", impact: en ? "May improve analysis stability" : "可能提升分析稳定性", strength: "强推荐", action: en ? "Handle missing" : "处理缺失" });
  if (sampleSize < 100) recs.push({ issue: en ? `N=${sampleSize} (small)` : `N=${sampleSize} (偏小)`, recommendation: en ? "Use Bootstrap estimation to assess result stability" : "使用 Bootstrap 方法评估结果稳定性", impact: en ? "Helps assess whether results are stable" : "有助于判断结果是否稳定", strength: "建议", action: en ? "Bootstrap" : "Bootstrap" });
  if (alpha > 0 && alpha < 0.70) recs.push({ issue: en ? `Low α (${alpha.toFixed(2)})` : `α 偏低 (${alpha.toFixed(2)})`, recommendation: en ? "Review items with low item-total correlations" : "检查题总相关较低的题项", impact: en ? "Item review may help identify sources of low consistency" : "题项检查可能有助于发现一致性偏低的原因", strength: "强推荐", action: en ? "Review items" : "检查题项" });
  if (reverseRisks.length > 0) recs.push({ issue: en ? `${reverseRisks.length} items may need direction check` : `${reverseRisks.length} 个题项可能需要核实方向`, recommendation: en ? "Verify coding direction for potentially reverse-scored items" : "核实可能存在反向计分的题项方向", impact: en ? "Correct coding may improve scale consistency" : "正确计分可能提升量表一致性", strength: "建议", action: en ? "Verify items" : "核实题项" });
  if (kmo > 0 && kmo < 0.60) recs.push({ issue: en ? `KMO too low (${kmo.toFixed(2)})` : `KMO 过低 (${kmo.toFixed(2)})`, recommendation: en ? "Review inter-item correlation structure" : "检查题项间相关结构", impact: en ? "May help identify items with low shared variance" : "可能有助于发现共享方差较低的题项", strength: "可选", action: en ? "Review" : "检查" });

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
      reason: scaleReason,
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
    score_explanation: buildScoreExplanation(alpha, likertCols.length, en),
  };
}

function buildScoreExplanation(alpha: number, itemCount: number, en: boolean) {
  const why = alpha > 0
    ? (en
      ? `Cronbach's α = ${alpha.toFixed(3)}. Score mapping: α ≥ .90 → 100, ≥ .80 → 85, ≥ .70 → 70, ≥ .60 → 50, < .60 → 25. Current α falls in the ${alpha >= 0.9 ? "≥ .90" : alpha >= 0.8 ? "≥ .80" : alpha >= 0.7 ? "≥ .70" : alpha >= 0.6 ? "≥ .60" : "< .60"} range.`
      : (en ? "α not computed." : `α 未计算。`))
    : (en
      ? `Cronbach's α not available — ${itemCount < 2 ? `only ${itemCount} Likert item(s), need ≥ 2` : "no analysis has been run"}.`
      : `Cronbach's α 不可用 — ${itemCount < 2 ? `仅 ${itemCount} 个 Likert 题项，需要 ≥ 2` : "尚未运行分析"}。`);

  const stability = en
    ? `Score based solely on Cronbach's α. Does not factor in sample size, missing data, or factor structure — those are separate sub-scores.`
    : `分数仅基于 Cronbach's α。未纳入样本量、缺失数据或因子结构——这些由其他子分数独立评估。`;

  const uncertainty = en
    ? `This score reflects internal consistency only. It does not assess construct validity, content validity, or test-retest reliability. Researchers should triangulate with other evidence.`
    : `此分数仅反映内部一致性。不评估构念效度、内容效度或重测信度。研究者应结合其他证据综合判断。`;

  return { why_this_score: why, stability_factors: stability, uncertainty_notes: uncertainty };
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
