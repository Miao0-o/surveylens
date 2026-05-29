// ============================================================
// Export Generators — Markdown, Quarto, APA text
// ============================================================

import type { AnalysisResults, AIResults } from "@/types";
import { generateAllSnippets } from "./apa-snippets";
import { getSummaryAPA } from "@/lib/analysis/registry";

function fmt(n: number, d = 2): string {
  return n.toFixed(d);
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

export function apaResultsText(results: AnalysisResults, lang: "zh" | "en" = "en"): string {
  const snippets = generateAllSnippets(results);
  return snippets.map(s => `## ${s.section}\n\n${s.text}`).join("\n\n---\n\n");
}

export function downloadAPAResults(results: AnalysisResults, lang: "zh" | "en" = "en") {
  const text = apaResultsText(results, lang);
  downloadText(text, `survey-lens-apa-results-${lang}.txt`);
}

// ============================================================
// Markdown Report
// ============================================================

export function markdownReport(results: AnalysisResults, aiResults: AIResults | null, lang: "zh" | "en" = "en"): string {
  const en = lang === "en";
  const { reliability, validity, efa, stability, meta } = results;
  const lines: string[] = [];

  lines.push(`# ${en ? "SurveyLens Analysis Report" : "SurveyLens 分析报告"}`);
  lines.push(`*${new Date().toISOString().slice(0, 10)}*`);
  lines.push("");

  // Overview
  lines.push(`## ${en ? "Dataset Overview" : "数据集概览"}`);
  lines.push(`- ${en ? "Sample size" : "样本量"}: ${meta.sampleSize}`);
  lines.push(`- ${en ? "Items" : "题项数"}: ${meta.itemCount}`);
  lines.push("");

  // Reliability
  lines.push(`## ${en ? "Reliability" : "信度"}`);
  if (reliability.cronbachsAlpha > 0) {
    lines.push(`- Cronbach's α: ${fmt(reliability.cronbachsAlpha, 3)}`);
    if (reliability.standardizedAlpha != null) lines.push(`- ${en ? "Standardized α" : "标准化 α"}: ${fmt(reliability.standardizedAlpha, 3)}`);
    if (reliability.mcdonaldsOmega != null && reliability.mcdonaldsOmega > 0) lines.push(`- McDonald's ω: ${fmt(reliability.mcdonaldsOmega, 3)}`);
  }
  if (reliability.dimensions && reliability.dimensions.length > 0) {
    lines.push("");
    lines.push(`| ${en ? "Scale" : "量表"} | α | ${en ? "Items" : "题项"} |`);
    lines.push("|---|---|---|");
    for (const d of reliability.dimensions) {
      lines.push(`| ${d.name} | ${fmt(d.cronbachsAlpha, 2)} | ${d.items.length} |`);
    }
  }
  lines.push("");

  // Validity
  lines.push(`## ${en ? "Factor Analysis" : "因子分析"}`);
  if (validity.kmo > 0) {
    lines.push(`- KMO: ${fmt(validity.kmo, 2)}`);
    const bp = validity.bartlettPValue < 0.001 ? "p < .001" : `p = ${fmt(validity.bartlettPValue, 3)}`;
    lines.push(`- Bartlett's χ²: ${fmt(validity.bartlettChiSquare, 2)}, df = ${validity.bartlettDf}, ${bp}`);
    if (efa.suggestedFactors > 0) {
      const tv = (efa.varianceExplained.reduce((a, b) => a + b, 0) * 100).toFixed(1);
      lines.push(`- ${en ? "Suggested factors" : "建议因子数"}: ${efa.suggestedFactors} (${en ? "explained variance" : "解释方差"}: ${tv}%)`);
    }
  }
  lines.push("");

  // Stability
  lines.push(`## ${en ? "Statistical Stability" : "统计稳定性"}`);
  lines.push(`- ${en ? "Level" : "水平"}: ${stability.stabilityLevel}`);
  if (stability.recommendedSampleSize > 0) lines.push(`- ${en ? "Recommended N" : "推荐 N"}: ${stability.recommendedSampleSize}`);
  lines.push("");

  // APA summary
  lines.push(`## ${en ? "APA Summary" : "APA 摘要"}`);
  const summary = getSummaryAPA(results, lang);
  lines.push(summary || en ? "No significant results." : "无显著结果。");
  lines.push("");

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

  return lines.join("\n");
}

export function downloadMarkdownReport(results: AnalysisResults, aiResults: AIResults | null, lang: "zh" | "en" = "en") {
  downloadText(markdownReport(results, aiResults, lang), `survey-lens-report-${lang}.md`);
}

// ============================================================
// Quarto Report (.qmd)
// ============================================================

export function quartoReport(results: AnalysisResults, aiResults: AIResults | null, lang: "zh" | "en" = "en"): string {
  const en = lang === "en";
  const lines: string[] = [];

  // YAML header
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

export function downloadQuartoReport(results: AnalysisResults, aiResults: AIResults | null, lang: "zh" | "en" = "en") {
  downloadText(quartoReport(results, aiResults, lang), `survey-lens-report-${lang}.qmd`);
}
