// ============================================================
// Output Guard (Layer 5 — Final Safety Gate)
// Validates AI interpretation output before rendering to UI
// Detects: fabricated numbers, contradictions, overstatements
// ============================================================

import type { AIResults, AnalysisResults, ValidationReport } from "@/types";

export interface GuardResult {
  passed: boolean;
  violations: GuardViolation[];
  sanitized: AIResults;
}

export interface GuardViolation {
  severity: "blocked" | "flagged";
  rule: string;
  detail: string;
}

// Known statistical values from the analysis — AI must not deviate
interface KnownValues {
  alpha: number;
  kmo: number;
  bartlettPValue: number;
  suggestedFactors: number;
  stabilityLevel: string;
  recommendedSampleSize: number;
  eigenvalueCount: number;
}

const OVERSTATEMENT_PATTERNS = [
  /proves/i,
  /guarantees/i,
  /definitely confirms/i,
  /absolutely/i,
  /beyond doubt/i,
  /undoubtedly/i,
  /without question/i,
];

const COMPUTATION_PATTERNS = [
  /improves alpha/i,
  /increases reliability/i,
  /would change.*if/i,
  /after removing.*alpha becomes/i,
  /should be deleted to/i,
  /by adjusting/i,
  /should re-run/i,
  /recompute/i,
  /re-analyze/i,
];

const FABRICATION_PATTERNS = [
  /CFA results? show/i,
  /SEM (?:results? )?indicate/i,
  /confirmatory factor/i,
  /path analysis/i,
  /structural equation/i,
];

export function guardAIOutput(
  aiResults: AIResults,
  analysis: AnalysisResults,
  validation: ValidationReport
): GuardResult {
  const violations: GuardViolation[] = [];
  const known = extractKnownValues(analysis);

  // ── Check 1: Numerical fabrication ──
  const allText = [
    aiResults.explanation.simple,
    aiResults.explanation.academic,
    ...aiResults.suggestions.map((s) => s.detail),
    aiResults.apaResult,
  ].join("\n");

  // Extract all numbers from AI text
  const aiNumbers = extractNumbers(allText);

  for (const num of aiNumbers) {
    // Alpha-related numbers: must match known alpha (±0.02)
    if (Math.abs(num - known.alpha) < 0.02) continue;
    if (Math.abs(num - known.kmo) < 0.02) continue;

    // Factor count: must match suggestedFactors
    if (num === known.suggestedFactors) continue;

    // Sample size: must match
    if (num === known.recommendedSampleSize) continue;

    // Bartlett p-value
    if (num === known.bartlettPValue) continue;

    // If a number looks like a fabricated statistical result, flag it
    if (num > 0 && num < 1 && num !== known.alpha && num !== known.kmo) {
      violations.push({
        severity: "flagged",
        rule: "fabricated_statistic",
        detail: `AI introduced value ${num} not present in input. May be hallucinated.`,
      });
    }
  }

  // ── Check 2: Overstatement detection ──
  for (const pattern of OVERSTATEMENT_PATTERNS) {
    if (pattern.test(allText)) {
      violations.push({
        severity: "flagged",
        rule: "overstatement",
        detail: `AI used overconfident language matching: "${pattern.source}". Academic language should be conservative.`,
      });
      break; // one is enough
    }
  }

  // ── Check 3: Computation claims ──
  for (const pattern of COMPUTATION_PATTERNS) {
    if (pattern.test(allText)) {
      violations.push({
        severity: "blocked",
        rule: "claims_computation",
        detail: `AI claimed to modify or recommend modifying statistics: "${pattern.source}". AI is interpretation-only.`,
      });
      break;
    }
  }

  // ── Check 4: Fabrication of unsupported methods ──
  for (const pattern of FABRICATION_PATTERNS) {
    if (pattern.test(allText)) {
      violations.push({
        severity: "flagged",
        rule: "fabricated_method",
        detail: `AI referenced analysis method not present in results (CFA/SEM).`,
      });
      break;
    }
  }

  // ── Check 5: Contradiction with validation layer ──
  if (validation.confidence.overall < 0.40) {
    // If confidence is low, AI should not claim high reliability
    const claimsHigh = /\b(?:excellent|strong|high|very good)\s+(?:reliability|validity|consistency)\b/i;
    if (claimsHigh.test(allText)) {
      violations.push({
        severity: "flagged",
        rule: "contradicts_validation",
        detail: "AI claims high reliability/validity but validation confidence is LOW.",
      });
    }
  }

  // ── Sanitize: remove blocked content markers ──
  const sanitized: AIResults = { ...aiResults };

  for (const v of violations) {
    if (v.severity === "blocked") {
      // Prepend warning to affected text
      sanitized.explanation.simple = `[⚠️ AI 输出被部分过滤：${v.detail}] ` + sanitized.explanation.simple;
      break;
    }
  }

  const blocked = violations.filter((v) => v.severity === "blocked");
  const passed = blocked.length === 0;

  return { passed, violations, sanitized: passed ? aiResults : sanitized };
}

function extractKnownValues(analysis: AnalysisResults): KnownValues {
  return {
    alpha: analysis.reliability.cronbachsAlpha,
    kmo: analysis.validity.kmo,
    bartlettPValue: analysis.validity.bartlettPValue,
    suggestedFactors: analysis.efa.suggestedFactors,
    stabilityLevel: analysis.stability.stabilityLevel,
    recommendedSampleSize: analysis.stability.recommendedSampleSize,
    eigenvalueCount: analysis.efa.eigenvalues.length,
  };
}

function extractNumbers(text: string): number[] {
  const matches = text.match(/\b\d+\.\d+\b|\b\d+\b/g);
  if (!matches) return [];
  return matches.map(Number).filter((n) => !isNaN(n));
}
