// ============================================================
// APA Snippet Engine — Client-side, no AI required
// Generates one-line APA interpretations from statistical results
// ============================================================

import type { AnalysisResults } from "@/types";

export interface APASnippet {
  section: string;
  text: string;
}

export function generateAllSnippets(results: AnalysisResults): APASnippet[] {
  const snippets: APASnippet[] = [];
  const { reliability, validity, efa, stability, meta } = results;

  // Reliability
  const alpha = reliability.cronbachsAlpha;
  if (alpha > 0) {
    const level = alpha >= 0.90 ? "excellent" : alpha >= 0.80 ? "good" : alpha >= 0.70 ? "acceptable" : "low";
    snippets.push({
      section: "信度",
      text: `Cronbach's alpha indicated ${level} internal consistency (α = ${alpha.toFixed(2)}${reliability.standardizedAlpha > 0 ? `, standardized α = ${reliability.standardizedAlpha.toFixed(2)}` : ""}).`,
    });
    if (reliability.mcdonaldsOmega > 0) {
      snippets.push({
        section: "信度",
        text: `McDonald's omega was ${reliability.mcdonaldsOmega.toFixed(2)}, supporting the factor-based reliability estimate.`,
      });
    }
  }

  // Validity
  if (validity.kmo > 0) {
    const kmoLabel = validity.kmo >= 0.90 ? "marvelous" : validity.kmo >= 0.80 ? "meritorious" : validity.kmo >= 0.70 ? "middling" : validity.kmo >= 0.60 ? "mediocre" : validity.kmo >= 0.50 ? "miserable" : "unacceptable";
    snippets.push({
      section: "效度",
      text: `The KMO measure of sampling adequacy was ${validity.kmo.toFixed(2)} (${kmoLabel}), and Bartlett's test of sphericity was ${validity.bartlettPValue < 0.001 ? "significant, p < .001" : validity.bartlettPValue < 0.05 ? `significant, p = ${validity.bartlettPValue.toFixed(3)}` : `not significant, p = ${validity.bartlettPValue.toFixed(3)}`}.`,
    });
  }

  // EFA
  if (efa.suggestedFactors > 0) {
    const totalVar = (efa.varianceExplained.reduce((a, b) => a + b, 0) * 100).toFixed(1);
    snippets.push({
      section: "因子分析",
      text: `Exploratory factor analysis (${efa.rotation} rotation) suggested ${efa.suggestedFactors} factor(s), explaining ${totalVar}% of the total variance.`,
    });
  }

  // Top factor loadings
  if (efa.loadings.length > 0 && efa.loadings[0].length > 0) {
    const topItems: string[] = [];
    for (let f = 0; f < efa.suggestedFactors && f < efa.loadings[0].length; f++) {
      const items = efa.loadings
        .map((row, i) => ({ label: efa.itemLabels[i] ?? `Q${i + 1}`, loading: row[f] }))
        .filter((item) => Math.abs(item.loading) >= 0.40)
        .sort((a, b) => Math.abs(b.loading) - Math.abs(a.loading))
        .slice(0, 3)
        .map((item) => `${item.label} (${item.loading.toFixed(2)})`)
        .join(", ");
      if (items) topItems.push(`Factor ${f + 1}: ${items}`);
    }
    if (topItems.length > 0) {
      snippets.push({
        section: "因子分析",
        text: `Primary factor loadings — ${topItems.join("; ")}.`,
      });
    }
  }

  // Stability
  if (stability.stabilityLevel !== "unstable" || stability.recommendedSampleSize > 0) {
    const stabLabel = stability.stabilityLevel === "stable" ? "stable" : stability.stabilityLevel === "moderate" ? "moderately stable" : "unstable";
    snippets.push({
      section: "稳定性",
      text: `Bootstrap stability analysis (${stability.bootstrapSamples} resamples) indicated a ${stabLabel} factor solution${stability.recommendedSampleSize > 0 ? `, with a recommended minimum sample size of N = ${stability.recommendedSampleSize}` : ""}.`,
    });
  }

  // Sample note
  if (meta.sampleSize > 0) {
    snippets.push({
      section: "概览",
      text: `Analysis based on N = ${meta.sampleSize} with ${meta.itemCount} items.`,
    });
  }

  return snippets;
}

/** Generate a compact 2-5 sentence summary for PDF export */
export function generateCompactSummary(results: AnalysisResults): string {
  const snippets = generateAllSnippets(results);
  const combined = snippets.map((s) => s.text).filter(Boolean);
  return combined.slice(0, 5).join(" ");
}
