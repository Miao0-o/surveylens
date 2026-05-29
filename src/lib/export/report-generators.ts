// ============================================================
// Export Generators — Markdown, Quarto, APA text
// ============================================================

import type { AnalysisResults, AIResults } from "@/types";
import { generateAllSnippets } from "./apa-snippets";
import { getSummaryAPA, detectAnalysisMode } from "@/lib/analysis/registry";

function fmt(n: number, d = 2): string {
  return n.toFixed(d);
}

/** Build export metadata header block */
function buildExportHeader(
  results: AnalysisResults,
  design: { outcomeVariables?: string[]; predictorVariables?: string[] } | null,
  lang: "zh" | "en",
  readinessScore: number,
  readinessLabel: string
): string[] {
  const en = lang === "en";
  const mode = detectAnalysisMode(design);
  const modeLabel = mode === "multi" ? (en ? "Multi Scale" : "多量表")
    : mode === "single" ? (en ? "Single Scale" : "单量表")
    : (en ? "Exploratory" : "探索性");

  return [
    "---",
    en ? "SurveyLens Report" : "SurveyLens 报告",
    "",
    `${en ? "Generated" : "生成时间"}: ${new Date().toISOString().slice(0, 10)}`,
    `${en ? "Language" : "语言"}: ${lang === "en" ? "English" : "中文"}`,
    `${en ? "Mode" : "模式"}: ${modeLabel}`,
    `${en ? "Readiness" : "准备度"}: ${readinessScore} (${readinessLabel})`,
    `${en ? "Sample" : "样本量"}: N = ${results.meta.sampleSize}`,
    `${en ? "Items" : "题项数"}: ${results.meta.itemCount}`,
    "---",
    "",
  ];
}

/** Download a text file */
function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

// ============================================================
// APA Results text (copy-friendly)
// ============================================================

export function apaResultsText(
  results: AnalysisResults,
  lang: "zh" | "en" = "en",
  design?: { outcomeVariables?: string[]; predictorVariables?: string[] } | null,
  readinessScore = 0, readinessLabel = ""
): string {
  const en = lang === "en";
  const header = buildExportHeader(results, design ?? null, lang, readinessScore, readinessLabel);
  const snippets = generateAllSnippets(results);
  // Manuscript-style: join snippets as a flowing paragraph, not bullet lists
  const body = snippets.map(s => s.text).join(" ");
  return [...header, body].join("\n\n");
}

export function downloadAPAResults(
  results: AnalysisResults, lang: "zh" | "en" = "en",
  design?: { outcomeVariables?: string[]; predictorVariables?: string[] } | null,
  readinessScore = 0, readinessLabel = ""
) {
  downloadText(apaResultsText(results, lang, design, readinessScore, readinessLabel), `survey-lens-apa-results-${lang}.txt`);
}

// ============================================================
// Markdown Report
// ============================================================

export function markdownReport(
  results: AnalysisResults, aiResults: AIResults | null,
  lang: "zh" | "en" = "en",
  design?: { outcomeVariables?: string[]; predictorVariables?: string[] } | null,
  readinessScore = 0, readinessLabel = ""
): string {
  const en = lang === "en";
  const { reliability, validity, efa, stability, meta } = results;
  const lines: string[] = [];

  // Cover
  lines.push(...buildExportHeader(results, design ?? null, lang, readinessScore, readinessLabel));
  const mode = design && ([...(design.outcomeVariables ?? []), ...(design.predictorVariables ?? [])].length > 0) ? "custom" : "quick";
  lines.push(`# ${en ? "SurveyLens Analysis Report" : "SurveyLens 分析报告"}`);
  lines.push(`**${en ? "Readiness" : "准备度"}**: ${readinessLabel} (${readinessScore}) · ${mode === "custom" ? (en ? "Custom Mode" : "自定义模式") : (en ? "Quick Mode" : "快速模式")}`);
  lines.push("");

  // 1. Reliability
  lines.push(`## 1. ${en ? "Reliability" : "信度分析"}`);
  if (reliability.cronbachsAlpha > 0) {
    lines.push(`- Cronbach's α: **${fmt(reliability.cronbachsAlpha, 3)}**`);
    if (reliability.standardizedAlpha != null) lines.push(`- ${en ? "Standardized α" : "标准化 α"}: ${fmt(reliability.standardizedAlpha, 3)}`);
    if (reliability.mcdonaldsOmega != null && reliability.mcdonaldsOmega > 0) lines.push(`- McDonald's ω: ${fmt(reliability.mcdonaldsOmega, 3)}`);
  }
  if (reliability.dimensions && reliability.dimensions.length > 0) {
    lines.push("");
    lines.push(`| ${en ? "Scale" : "量表"} | α | ${en ? "Interpretation" : "解读"} | ${en ? "Items" : "题项"} |`);
    lines.push("|---|---|---|---|");
    for (const d of reliability.dimensions) {
      const interp = d.cronbachsAlpha >= 0.90 ? (en ? "Excellent" : "优秀") : d.cronbachsAlpha >= 0.80 ? (en ? "Good" : "良好") : d.cronbachsAlpha >= 0.70 ? (en ? "Acceptable" : "可接受") : (en ? "Low" : "偏低");
      lines.push(`| ${d.name} | ${fmt(d.cronbachsAlpha, 2)} | ${interp} | ${d.items.length} |`);
    }
  }
  lines.push("");

  // 2. Validity
  lines.push(`## 2. ${en ? "Validity" : "效度分析"}`);
  if (validity.correlationMatrix.length >= 2) {
    const n = validity.correlationMatrix.length;
    lines.push(`${en ? "Scale correlation matrix" : "量表相关矩阵"}: ${n} × ${n}`);
    // Find strongest relationships
    let maxR = 0; let maxA = ""; let maxB = "";
    const overlaps: string[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const r = validity.correlationMatrix[i][j];
        if (r == null || isNaN(r)) continue;
        if (Math.abs(r) > Math.abs(maxR)) { maxR = r; maxA = validity.columnLabels[i] ?? ""; maxB = validity.columnLabels[j] ?? ""; }
        if (Math.abs(r) >= 0.80) overlaps.push(`${validity.columnLabels[i]} ↔ ${validity.columnLabels[j]} (r = ${r.toFixed(2)})`);
      }
    }
    if (maxA) lines.push(`- ${en ? "Strongest relationship" : "最强关联"}: ${maxA} ↔ ${maxB} (r = ${maxR.toFixed(2)})`);
    if (overlaps.length > 0) {
      lines.push(`- ${en ? "Potential overlap / redundancy" : "潜在重叠/冗余"}:`);
      overlaps.forEach(o => lines.push(`  - ${o}`));
    }
  }
  lines.push("");

  // 3. Factor Analysis
  lines.push(`## 3. ${en ? "Factor Analysis" : "因子分析"}`);
  if (validity.kmo > 0) {
    lines.push(`- KMO: ${fmt(validity.kmo, 2)} (${validity.kmo >= 0.80 ? (en ? "Good" : "良好") : validity.kmo >= 0.60 ? (en ? "Acceptable" : "可接受") : (en ? "Weak" : "较弱")})`);
    const bp = validity.bartlettPValue < 0.001 ? "p < .001" : `p = ${fmt(validity.bartlettPValue, 3)}`;
    lines.push(`- Bartlett's Test: χ² = ${fmt(validity.bartlettChiSquare, 0)}, df = ${validity.bartlettDf}, ${bp}`);
    if (efa.suggestedFactors > 0) {
      const tv = (efa.varianceExplained.reduce((a, b) => a + b, 0) * 100).toFixed(1);
      lines.push(`- ${en ? "Factors" : "因子数"}: ${efa.suggestedFactors} (${tv}% ${en ? "variance explained" : "解释方差"})`);
    }
  }
  lines.push("");

  // 4. Stability
  lines.push(`## 4. ${en ? "Statistical Stability" : "统计稳定性"}`);
  if (stability.stabilityLevel != null) {
    lines.push(`- ${en ? "Stability" : "稳定性"}: **${stability.stabilityLevel}**`);
  } else {
    lines.push(`- ${en ? "Not assessed" : "未评估"}`);
  }
  if (stability.recommendedSampleSize != null && stability.recommendedSampleSize > 0) lines.push(`- ${en ? "Recommended N" : "推荐 N"}: ${stability.recommendedSampleSize}`);
  lines.push("");

  // 5. APA summary
  const summary = getSummaryAPA(results, lang);
  if (summary) {
    lines.push(`## 5. ${en ? "APA Summary" : "APA 摘要"}`);
    lines.push(summary);
    lines.push("");
  }

  // AI
  if (aiResults) {
    lines.push(`## ${en ? "AI Interpretation" : "AI 解读"}`);
    if (aiResults.executive_summary) {
      lines.push(aiResults.executive_summary.overall_assessment);
    } else {
      lines.push(aiResults.explanation.academic);
    }
    if (aiResults.priority_actions && aiResults.priority_actions.length > 0) {
      lines.push("");
      lines.push(`### ${en ? "Recommendations" : "建议"}`);
      for (const a of aiResults.priority_actions) {
        lines.push(`- **${a.priority.toUpperCase()}**: ${a.action} — ${a.rationale}`);
      }
    }
    lines.push("");
  }

  // Methodology footer
  lines.push("---");
  lines.push("");
  lines.push(`*${en ? "Generated by SurveyLens v1.0" : "由 SurveyLens v1.0 生成"}*`);
  lines.push("");
  lines.push(`${en ? "Analyses include" : "分析包含"}: ${en ? "Reliability, Validity, Factor Analysis, Stability, Readiness" : "信度、效度、因子分析、稳定性、准备度"}.`);
  lines.push(`${en ? "See Methodology Center for assumptions and limitations." : "假设与局限性请参见方法论中心。"}`);

  return lines.join("\n");
}

export function downloadMarkdownReport(
  results: AnalysisResults, aiResults: AIResults | null, lang: "zh" | "en" = "en",
  design?: { outcomeVariables?: string[]; predictorVariables?: string[] } | null,
  readinessScore = 0, readinessLabel = ""
) {
  downloadText(markdownReport(results, aiResults, lang, design, readinessScore, readinessLabel), `survey-lens-report-${lang}.md`);
}

// ============================================================
// Quarto Report (.qmd)
// ============================================================

export function quartoReport(
  results: AnalysisResults, aiResults: AIResults | null,
  lang: "zh" | "en" = "en",
  design?: { outcomeVariables?: string[]; predictorVariables?: string[] } | null,
  readinessScore = 0, readinessLabel = ""
): string {
  const en = lang === "en";
  const lines: string[] = [];

  // YAML header with metadata
  lines.push("---");
  lines.push(`title: "${en ? "SurveyLens Analysis Report" : "SurveyLens 分析报告"}"`);
  lines.push(`date: "${new Date().toISOString().slice(0, 10)}"`);
  lines.push(`lang: "${lang}"`);
  lines.push("format: html");
  lines.push("---");
  lines.push("");
  lines.push(...buildExportHeader(results, design ?? null, lang, readinessScore, readinessLabel).map(l => `# ${l}`));
  lines.push("");
  lines.push("---");
  lines.push(`title: "${en ? "Survey Analysis Report" : "问卷分析报告"}"`);
  lines.push(`date: "${new Date().toISOString().slice(0, 10)}"`);
  lines.push("format: html");
  lines.push("---");
  lines.push("");

  // Executive summary
  lines.push(`# ${en ? "Executive Summary" : "执行摘要"}`);
  if (aiResults?.executive_summary) {
    lines.push(aiResults.executive_summary.overall_assessment);
  } else {
    const summary = getSummaryAPA(results, lang);
    lines.push(summary || "");
  }
  lines.push("");

  // Reliability
  lines.push(`# ${en ? "Reliability" : "信度分析"}`);
  lines.push(`\`\`\`{r, echo=FALSE}`);
  if (results.reliability.cronbachsAlpha > 0) {
    lines.push(`# Cronbach's alpha: ${fmt(results.reliability.cronbachsAlpha, 3)}`);
  }
  if (results.reliability.dimensions && results.reliability.dimensions.length > 0) {
    lines.push("# Scale | Alpha | Items");
    lines.push("# --- | --- | ---");
    for (const d of results.reliability.dimensions) {
      lines.push(`# ${d.name} | ${fmt(d.cronbachsAlpha, 2)} | ${d.items.length}`);
    }
  }
  lines.push("\`\`\`");
  lines.push("");

  // Factor Analysis
  lines.push(`# ${en ? "Factor Analysis" : "因子分析"}`);
  if (results.validity.kmo > 0) {
    lines.push(`- KMO = ${fmt(results.validity.kmo, 2)}`);
    lines.push(`- Bartlett's Test: χ² = ${fmt(results.validity.bartlettChiSquare, 2)}, df = ${results.validity.bartlettDf}, ${results.validity.bartlettPValue < 0.001 ? "p < .001" : `p = ${fmt(results.validity.bartlettPValue, 3)}`}`);
  }
  lines.push("");

  // Recommendations
  if (aiResults?.priority_actions && aiResults.priority_actions.length > 0) {
    lines.push(`# ${en ? "Recommendations" : "改进建议"}`);
    for (const a of aiResults.priority_actions) {
      lines.push(`- **[${a.priority.toUpperCase()}]** ${a.action}: ${a.rationale}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadQuartoReport(
  results: AnalysisResults, aiResults: AIResults | null, lang: "zh" | "en" = "en",
  design?: { outcomeVariables?: string[]; predictorVariables?: string[] } | null,
  readinessScore = 0, readinessLabel = ""
) {
  downloadText(quartoReport(results, aiResults, lang, design, readinessScore, readinessLabel), `survey-lens-report-${lang}.qmd`);
}
