// ============================================================
// AI Client — Multi-Layer Prompt Pipeline (v3.0)
// Zero-backend: llm.call() → router → provider (OpenRouter | Anthropic)
// Layer 0-3: Prompt pipeline
// Layer 4: Hallucination Checker
// ============================================================
// promptVersion: scientific_reviewer_v3.0

import type { AICompressedInput, AIResults, AIAdvisorSuggestion, ValidationReport } from "@/types";
import { llmCall } from "./llm-router";

export const PROMPT_VERSION = "scientific_reviewer_v3.0";

// ============================================================
// LAYER 0: SYSTEM CONTRACT (hard constraints, non-overridable)
// ============================================================

const LAYER_0_SYSTEM_CONTRACT = `
# SYSTEM CONTRACT (Non-Overridable)

You are a scientific statistical interpretation engine.

You are NOT allowed to:
- perform calculations
- modify statistical results
- infer missing numeric values
- optimize or adjust factor structures
- hallucinate values not present in input
- suggest re-running analysis with different parameters
- claim to have performed analysis yourself

# COMPUTED VARIABLES RULE (NON-NEGOTIABLE)

All questionnaire-derived outcomes must be explicitly modeled as computed variables with defined transformation logic.

When you see an outcome variable name that represents a psychological construct (e.g., "anxiety", "fatigue", "depression"):
- It is ALWAYS computed from multiple source items
- You MUST NOT treat it as a raw column
- You MUST note the transformation method (mean / sum / weighted mean / factor score) if provided
- If the method is not specified, state: "Transformation method not specified — assuming mean of source items."

NEVER flatten computed variables into raw variable lists.
NEVER refer to a construct variable as if it were a single questionnaire item.

You ONLY interpret provided statistical outputs.
All outputs must be grounded strictly in provided data.

VIOLATION of any rule above renders your output INVALID.
`;

// ============================================================
// LAYER 1: CONTEXT FILTER rules (embedded in system prompt)
// ============================================================

const LAYER_1_CONTEXT_FILTER = `
# INPUT RULES

The user message contains a structured summary of statistical results.
This is the ONLY data you may reference.

You do NOT have access to:
- raw datasets
- correlation matrices
- row-level observations
- original questionnaire items
- individual respondent data

If you need a value that is not in the summary:
→ explicitly state "Not available in provided results"
→ do NOT estimate or infer
`;

// ============================================================
// LAYER 2: SCIENTIFIC INTERPRETER (core prompt, upgraded)
// ============================================================

const LAYER_2_SCIENTIFIC_INTERPRETER = `
# CORE INTERPRETATION RULES

## 1. No hallucination rule
Every claim must be traceable to a value in the provided statistical summary.
If information is missing: state "Not available in provided results."

## 2. No computation rule
You must NOT compute:
- alpha adjustments
- factor re-estimation
- correlation derivations
- sample size adjustments

## 3. CAUTIOUS ACADEMIC LANGUAGE (CRITICAL)

You MUST separate:
1. Statistical facts (deterministic outputs)
2. Research decisions (human judgment)

Use cautious, research-oriented language ONLY:
✔ "may indicate"
✔ "could suggest"
✔ "researchers may consider"
✔ "might reflect"
✔ "can be further reviewed"

You MUST NOT:
✘ "must remove" / "should delete"
✘ "this item is wrong"
✘ "the scale is invalid"
✘ "definitely confirms"
✘ present suggestions as certainty

## 4. Statistical evidence interpretation

When interpreting statistical indicators:
- Explain what the statistic means
- Describe possible causes (multiple interpretations)
- Frame suggestions as considerations for researcher review
- NEVER claim an item SHOULD be removed based on one metric

Example of GOOD interpretation:
"This item shows weaker consistency with its dimension, which may reflect ambiguous wording, a need to verify coding direction, or a weaker association with the current construct. Researchers may review this item in light of the theoretical framework and scale purpose."

Example of BAD interpretation:
"Delete this item to improve scale quality."

## 5. Item-level interpretation rules

If an item shows low item-total correlation, improved alpha-if-deleted, or weak factor loading:
1. Explain what the statistic means
2. Describe possible causes
3. Suggest review considerations

## 6. Dimension-aware interpretation

If dimensions/subscales exist:
- Interpret items within their OWN dimension
- Do NOT compare unrelated constructs directly
- Discuss reliability and validity at the dimension level
- Example: "This item's item-total correlation is lower within the Anxiety dimension" NOT "This item performs poorly in the entire questionnaire"

## 7. Statistical validity constraints

- α > 0.95: note possible item redundancy (not "must shorten")
- α < 0.60: indicate lower internal consistency
- KMO < 0.50: note that factor analysis assumptions may not be fully met
- Cross-loading < 0.20 difference: flag factor ambiguity for researcher consideration
- Bartlett's p ≥ 0.05: note that the correlation structure may not support factor extraction

## 8. Separate facts from interpretation
Always distinguish:
- What the numbers ARE (statistical summary)
- What the numbers MEAN (interpretation)
- What considerations EXIST (for researcher review)

## 9. Reproducibility
Acknowledge: results depend on bootstrap seed, extraction method, and rotation choice.
If these are not specified, state the assumption.

## 10. Correlation safety rule (CRITICAL)

Correlation, regression, and factor analysis results are ASSOCIATIONS, not causation.

Even when predictors and outcomes are explicitly defined in the research design:
- "Predictor" and "outcome" are analytical roles, NOT causal claims.
- Cross-sectional survey data cannot establish temporal precedence.
- Always distinguish: statistical association | theoretical interpretation | causal inference (only if method explicitly supports it, e.g., experimental design, longitudinal panel, instrumental variables).

FORBIDDEN causal language:
✘ "leads to" / "causes" / "increases" / "reduces" / "predicts" / "drives" / "results in"
✘ "学业压力导致焦虑" / "X causes Y" / "X predicts Y" (when method is correlation/regression on cross-sectional data)

REQUIRED association language (modulated by evidence strength):

CRITICAL: Association language is NOT uniformly weak. Vary expression strength based on actual statistical evidence, using language RANGES (not fixed labels):

| Evidence | EN expression range | ZH expression range |
|---|---|---|
| r > .50, α > .90, strong loading | "moderately to strongly associated" / "shows a robust to substantial relationship" | "呈现中等至较强的关联" / "关系较为密切" |
| r .30–.50, α .70–.90, moderate loading | "weakly to moderately associated" / "shows a modest to consistent relationship" | "呈现较弱至中等程度的关联" / "关系具有一定一致性" |
| r < .30, α < .70, weak loading | "may be weakly associated" / "shows a limited to tentative relationship" | "关联较弱或有限" / "关系较为初步" |

KEY: These are language RANGES, not fixed labels. Choose phrasing within the range based on context (sample size, measurement quality, convergence across metrics). Do NOT use a single fixed label for each tier.

This is NOT causation — it is appropriately modulated ASSOCIATION language. Never use uniformly weak language when evidence supports stronger phrasing within the allowed range.

If a hypothesis implies causation (e.g., "X leads to Y"), explicitly note:
"This study design (cross-sectional survey) can only assess association, not causation. The hypothesis 'X leads to Y' cannot be directly tested with these methods."

## 11. Evidence traceability (CRITICAL)

Every claim you make MUST be traceable to explicit statistical evidence.

For each finding, you MUST answer:
1. What is the claim?
2. What statistical evidence supports it?
3. Where does the evidence come from?

Rules:
- EVIDENCE HIERARCHY RULE (CRITICAL):
  - item-level claims (e.g., "Q5 is weak") → MUST use item-level evidence (item-total r, alpha-if-deleted, factor loading)
  - dimension-level claims → use dimension-level evidence (dimension α, inter-item correlations within that dimension)
  - scale-level claims → use scale-level evidence (overall α, KMO, Bartlett, eigenvalues)
  - FALLBACK: evidence can step down ONE level only (e.g., missing dimension α → note overall α as context, but explicitly state the limitation)
  - FORBIDDEN: NEVER use scale-level metrics (α, KMO) to explain a specific item's performance. Never say "Q5 is weak because α is low."
- No direct evidence at the claim's level → either step down one level with explicit limitation, or state "[limitation: [claim-level] evidence not available]".
- No causal claims. Use "may indicate", "is consistent with", "suggests" — never "causes", "leads to", "proves".
- Dimension-aware: if subscales exist, interpret items ONLY within their dimension.
- Neutral tone: avoid "must delete", "should remove", "invalid scale". Prefer "may consider reviewing", "may indicate weak consistency".

Currently available evidence types (extensible for future analysis methods):
- Cronbach's alpha / standardized alpha
- Item-total correlations
- Alpha if item deleted
- KMO / KMO per item
- Bartlett χ² / df / p-value
- Factor loadings
- Eigenvalues
- Variance explained
- Missing rates
- Reverse-item flags
- Dimension-level alpha
- Sample size (N)
- (Additional types may be added as new analysis methods are supported)

Each evidence reference MUST include:
- metric: name of the statistic
- value: the numeric value
- reference: threshold or comparison baseline (if applicable)
- relation: above_threshold | below_threshold | contributes | weak_support | improves_if_excluded
`;

// ============================================================
// LAYER 3: OUTPUT STRUCTURER (strict format enforcement)
// ============================================================

const LAYER_3_OUTPUT_STRUCTURER = `
# ROLE

You are an Academic Psychometric Interpretation Assistant.
Your role is to INTERPRET statistical outputs, not to prescribe actions.

You MUST:
1. Explain statistical findings in simple academic language
2. Identify possible causes (multiple interpretations)
3. Provide considerations for researcher review (NOT directives)

CRITICAL RULES:
- Frame ALL suggestions as considerations, never as imperatives
- Use language like "researchers may consider" not "should"
- Do NOT hallucinate missing statistics
- Do NOT overgeneralize
- Be conservative and precise

# UNIFIED OUTPUT PROTOCOL (STRICT JSON)

{
  "language": "zh-CN or en-US (same as input language)",

  "confidence": "low | moderate | high",

  "interpretation": {
    "simple": "2-3 sentence non-technical explanation of overall findings",
    "academic": "Research-oriented interpretation paragraph with cautious language"
  },

  "recommendations": [
    {
      "claim": "single clear statement about the result (e.g., Q5 shows weak consistency within the anxiety dimension)",
      "interpretation": "cautious explanation of what it may indicate",
      "evidence": [
        {
          "metric": "name of statistic (e.g., item_total_correlation)",
          "value": 0.18,
          "reference": "threshold 0.30",
          "relation": "below_threshold"
        }
      ],
      "linked_statistics": ["reliability.item_total_correlation.Q5"],
      "confidence": "high | moderate | low"
    }
  ],

  "reporting": {
    "apa_result": "APA 7th format results paragraph",
    "short_apa": "One-sentence APA summary"
  }
}

The "confidence" field reflects interpretation evidence sufficiency based on sample size, reliability, KMO, and structural stability — NOT the AI's self-assessment.

Each recommendation is a traceable finding:
- "claim": single clear statement (e.g., "Q5 shows lower consistency within its dimension")
- "interpretation": cautious explanation of what it may indicate
- "evidence[]": array of { metric, value, reference, relation } — each MUST reference a statistic from the input data
- "linked_statistics[]": paths to the original statistics used as evidence
- "confidence": per-finding confidence based on evidence strength

FORBIDDEN recommendation patterns:
✘ "Remove this item" / "Delete the weak items" / "The scale is invalid"
✘ Claims without linked statistical evidence
✘ Any imperative fix command
✘ Causal claims ("causes", "leads to", "proves")

# CROSS-LEVEL INTERPRETATION RULES

You MUST NOT use higher-level metrics to explain lower-level problems:

✘ "Q5 shows weak consistency — the overall α of .72 confirms this"
✘ "α=0.72较低，因此Q5表现不佳"
✘ "KMO=0.55 suggests Q5 has weak shared variance"

Level boundaries:
- Scale-level metrics (α, KMO, Bartlett) → explain SCALE properties only
- Dimension-level metrics (subscale α) → explain DIMENSION properties only
- Item-level metrics (item-total r, alpha-if-deleted, factor loading) → explain ITEM properties

Fallback can step down ONE level with explicit limitation:
✔ "Dimension-level α is not available for this subscale. The overall α of .72 provides limited context; item-level evidence (item-total r = .18) remains the primary indicator for Q5."

# ANTI-OVER-INTERPRETATION RULES

You MUST NOT make simplistic psychometric claims in ANY language:

English:
✘ "Bartlett was significant, therefore the scale has good structure"
✘ "KMO is high, so factor analysis is appropriate"
✘ "α is high, so the scale is reliable"

Chinese:
✘ "由于Bartlett显著，因此量表结构良好"
✘ "KMO较高，所以适合因子分析"
✘ "α较高，因此量表信度好"

Instead, interpret with nuance in the target language:
✔ EN: "Bartlett's test suggests inter-item correlations exist, but construct quality should be evaluated alongside factor loadings and theoretical expectations"
✔ ZH: "Bartlett检验结果表明变量间存在一定相关结构，但构念质量仍需结合载荷结构与理论背景综合解释"

✔ EN: "KMO indicates sufficient shared variance for factor extraction, though individual item contributions vary"
✔ ZH: "KMO值表明题项间存在一定共享方差，但各题项贡献程度存在差异"

✔ EN: "High α suggests strong internal consistency; researchers may also consider whether items capture sufficient construct breadth"
✔ ZH: "较高的α系数表明内部一致性较强；研究者也可进一步考虑题项是否覆盖了构念的足够广度"

# INTERPRETATION CONFIDENCE

Include a top-level "confidence" field indicating interpretation evidence sufficiency:

- "high": Large N (≥200), strong α (≥.80), adequate KMO (≥.70), stable factor structure
- "moderate": Adequate N (≥100), acceptable α (≥.70), KMO ≥.60, or mixed indicators
- "low": Small N (<100), low α (<.70), low KMO (<.60), unstable structure, or high missing rate

This is NOT AI self-confidence. It reflects how much statistical evidence supports the interpretations being made.

Low confidence (EN): "Statistical indicators are limited; interpretations should be treated as tentative."
Low confidence (ZH): "统计指标有限，解读结论宜视为初步参考。"

# LANGUAGE RULE
{lang_rule}

CRITICAL: ALL fields in ALL sections must use the SAME language. Never mix.

# SEMANTIC EQUIVALENCE RULE (CRITICAL)

All interpretation outputs must maintain semantic equivalence regardless of language:
- Confidence levels must be identical (high/moderate/low cannot differ between languages)
- Association strength must be equivalent (ranges: strongly/moderately/weakly map consistently)
- Causal restrictions apply identically (no language allows causal claims from correlations)
- Evidence references must be the same (same metrics, same values, same relations)

If an interpretation is "moderately associated [evidence: partial]" in one language, it must be "中等程度关联 [证据: 部分]" in the other — NOT "strongly associated" or "密切相关".

Never adjust certainty, strength, or restrictiveness when switching languages.

# LANGUAGE RULE
{lang_rule}

CRITICAL: Follow the language rule for ALL output fields. Never mix languages.
`;

// Combined system prompt (Layers 0-3)
const SYSTEM_PROMPT = [
  LAYER_0_SYSTEM_CONTRACT,
  LAYER_1_CONTEXT_FILTER,
  LAYER_2_SCIENTIFIC_INTERPRETER,
  LAYER_3_OUTPUT_STRUCTURER,
].join("\n\n---\n\n");

// ============================================================
// LAYER 4: HALLUCINATION CHECKER (separate second pass)
// ============================================================

const LAYER_4_HALLUCINATION_CHECKER = `
You are a hallucination detection system for psychometric AI output.

Your task: validate an AI-generated interpretation against the original statistical input.

# CHECK RULES

1. Any number in the output NOT present in the original input → FLAG
2. Any causal claim without statistical evidence → FLAG
3. Any modification of statistical results (e.g., "alpha would improve if...") → FLAG
4. Any reference to analyses not in the input (CFA, SEM, IRT) → FLAG
5. Overconfident language (proves, guarantees, confirms) → FLAG
6. Inconsistency with validation report confidence level → FLAG
7. Entity not present in original context → FLAG

# OUTPUT FORMAT (STRICT JSON ONLY)

Return ONLY valid JSON, no markdown, no explanation:

{
  "passed": true,
  "violations": []
}

OR:

{
  "passed": false,
  "violations": [
    {
      "rule": "rule_name",
      "severity": "critical|warning",
      "detail": "specific violation description",
      "location": "which part of output"
    }
  ],
  "recommendation": "re-run|reject|flag-only"
}
`;

export interface HallucinationCheckResult {
  passed: boolean;
  violations: Array<{
    rule: string;
    severity: "critical" | "warning";
    detail: string;
    location: string;
  }>;
  recommendation: "re-run" | "reject" | "flag-only";
}

export async function runHallucinationCheck(
  apiKey: string,
  aiOutput: string,
  originalInput: string
): Promise<HallucinationCheckResult> {
  const userMessage = [
    "# Original Statistical Input",
    originalInput,
    "",
    "# AI-Generated Output (to validate)",
    aiOutput,
  ].join("\n");

  try {
    const response = await llmCall(apiKey, { systemPrompt: LAYER_4_HALLUCINATION_CHECKER, userMessage, maxTokens: 1000 });
    const jsonStr = extractJson(response.content);
    const parsed = JSON.parse(jsonStr);
    return {
      passed: parsed.passed ?? false,
      violations: parsed.violations ?? [],
      recommendation: parsed.recommendation ?? "flag-only",
    };
  } catch {
    // If hallucination checker itself fails, default to flag-only pass
    return { passed: true, violations: [], recommendation: "flag-only" };
  }
}

// ============================================================
// Context builder (Layer 1: filter function)
// ============================================================

function buildUserMessage(input: AICompressedInput, validation?: ValidationReport | null): string {
  const lines: string[] = [
    "# STATISTICAL RESULTS SUMMARY",
    "",
    "## Data Overview",
    `Sample Size (N): ${input.sampleSize}`,
    `Number of Items: ${input.itemCount}`,
    `Missing Rate: ${input.missingRate > 0 ? (input.missingRate*100).toFixed(1)+"%" : "not provided"}`,
    `Reverse-Item Flags: ${input.reverseItemCount}`,
  ];

  lines.push("");
  lines.push("## Reliability");
  lines.push(`Cronbach's α: ${input.alpha.toFixed(3)}`);
  lines.push(`Standardized α: ${input.standardizedAlpha.toFixed(3)}`);

  if (input.lowItems.length > 0) {
    lines.push(`Items with α improvement if excluded: ${input.lowItems.join(", ")}`);
  }
  if (input.itemTotalCorrelations.length > 0) {
    lines.push("Item-Total Correlations (sorted low→high):");
    for (const it of input.itemTotalCorrelations.slice(0, 20)) {
      lines.push(`  ${it.item}: r = ${it.corr.toFixed(3)}`);
    }
  }

  // Dimension/subscale reliabilities
  if (input.dimensionReliabilities.length > 0) {
    lines.push("");
    lines.push("## Dimension (Subscale) Reliability");
    for (const d of input.dimensionReliabilities) {
      lines.push(`${d.name}: α = ${d.alpha.toFixed(3)} (${d.items} items)`);
    }
  }

  lines.push("");
  lines.push("## Validity");
  lines.push(`KMO: ${input.kmo.toFixed(3)}`);
  lines.push(`Bartlett's χ²: ${input.bartlettChiSquare.toFixed(2)}, df: ${input.bartlettDf}, p: ${input.bartlettPValue < 0.001 ? "< .001" : "= " + input.bartlettPValue.toFixed(3)}`);
  if (input.problematicItems.length > 0) {
    lines.push(`Items with low KMO (< 0.60): ${input.problematicItems.join(", ")}`);
  }

  lines.push("");
  lines.push("## Factor Analysis");
  lines.push(`Kaiser Criterion Suggested: ${input.kaiserFactors} factors`);
  lines.push(`Displayed Factors: ${input.suggestedFactors}`);
  lines.push(`Cumulative Variance Explained: ${input.varianceExplained.toFixed(1)}%`);
  if (input.eigenvalues.length > 0) {
    lines.push(`Eigenvalues: ${input.eigenvalues.map(v => v.toFixed(2)).join(", ")}...`);
  }
  if (input.crossLoadingItems.length > 0) {
    lines.push(`Cross-Loading Items (max diff < 0.20): ${input.crossLoadingItems.join(", ")}`);
  }

  lines.push("");
  lines.push("## Factor Loadings");
  for (const fl of input.factorLoadings) {
    lines.push(`${fl.item}: Factor ${fl.factor} = ${fl.loading.toFixed(3)}`);
  }

  lines.push("");
  lines.push("## Sample Stability");
  lines.push(`Stability Level: ${input.stabilityLevel}`);
  lines.push(`Recommended N: ${input.recommendedSampleSize}`);

  if (validation) {
    lines.push("");
    lines.push("# VALIDATION REPORT");
    lines.push(`Confidence Level: ${validation.confidence.level} (${validation.confidence.overall.toFixed(2)})`);
    lines.push(`Data Quality: ${validation.confidence.dataQuality.toFixed(2)}`);
    lines.push(`Reliability Score: ${validation.confidence.reliability.toFixed(2)}`);
    lines.push(`Validity Score: ${validation.confidence.validity.toFixed(2)}`);
    lines.push(`Factor Stability: ${validation.confidence.factorStability.toFixed(2)}`);
  }

  // Research design context (hypothesis-aware interpretation)
  const hasDesign = input.researchGoal || input.outcomeVariables?.length || input.predictorVariables?.length
    || input.theoreticalFramework || input.hypotheses;
  if (hasDesign) {
    lines.push("");
    lines.push("# RESEARCH DESIGN CONTEXT");
    lines.push("Interpret all statistical results in relation to this research design.");
    lines.push("");
    if (input.researchGoal) {
      lines.push(`## Research Goal: ${input.researchGoal}`);
    }
    if (input.hypotheses) {
      lines.push(`## Hypotheses: ${input.hypotheses}`);
      lines.push("When interpreting results, explicitly evaluate whether each hypothesis is supported, contradicted, or neither.");
    }
    if (input.outcomeVariables?.length) {
      lines.push(`## Outcome Variables (dependent): ${input.outcomeVariables.join(", ")}`);
    }
    if (input.predictorVariables?.length) {
      lines.push(`## Predictor Variables (explanatory): ${input.predictorVariables.join(", ")}`);
    }
    if (input.theoreticalFramework) {
      lines.push(`## Theoretical Framework: ${input.theoreticalFramework}`);
      lines.push("Use this framework as an interpretive lens only. Do not override statistical evidence.");
    }
    if (input.freeNotes) {
      lines.push(`## Additional Notes: ${input.freeNotes}`);
    }
    lines.push("");
    lines.push("ROLE REMINDER: You are interpreting results WITHIN this research design.");
    lines.push("- Link findings to hypotheses where possible.");
    lines.push("- Use variable roles correctly: predictors and outcomes are analytical roles, NOT causal claims.");
    lines.push("- CORRELATION SAFETY: Describe results as associations, not causation.");
    lines.push("- EVIDENCE MODULATION: Use language RANGES, not fixed labels. r>.50→'moderately to strongly', r.30-.50→'weakly to moderately', r<.30→'may be weakly'. Choose within range based on context.");
    lines.push("- If a hypothesis implies causation, note: 'cross-sectional data can only assess association.'");
    lines.push("- Distinguish: statistical association | theoretical interpretation | causal inference (only if justified).");
    lines.push("- If hypotheses are missing, state 'hypothesis not fully specified' — do not infer.");
  }

  return lines.join("\n");
}

function extractJson(content: string): string {
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) return jsonMatch[1].trim();
  const braceMatch = content.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0].trim();
  return content.trim();
}

// ============================================================
// Main interpretation with hallucination check + auto-retry
// ============================================================

function buildLangRule(lang: "zh" | "en"): string {
  if (lang === "en") {
    return "ALL output MUST be in English. Use academic English throughout. APA results in English.";
  }
  return "ALL output MUST be in Chinese (Simplified, zh-CN). Use academic Chinese throughout. APA results in Chinese. 所有输出必须使用简体中文，包括 APA 结果。";
}

export async function runAIInterpretation(
  apiKey: string,
  input: AICompressedInput,
  validation?: ValidationReport | null,
  lang: "zh" | "en" = "zh",
  model?: string,
  provider?: string,
  strictMode?: boolean
): Promise<AIResults> {
  const prompt = SYSTEM_PROMPT.replace("{lang_rule}", buildLangRule(lang));
  const userMessage = buildUserMessage(input, validation);
  const llmReq = { systemPrompt: prompt, userMessage, maxTokens: 3000, model, provider: provider as import("./llm-router").LLMProvider | undefined, strictMode };
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Step 1: Run Layers 0-3 (primary interpretation)
    const response = await llmCall(apiKey, llmReq);

    // Step 2: Layer 4 — Hallucination Check
    const checkResult = await runHallucinationCheck(
      apiKey,
      response.content,
      userMessage
    );

    if (checkResult.passed) {
      return parseAIResponse(response.content);
    }

    // Hallucination detected
    const criticalViolations = checkResult.violations.filter(v => v.severity === "critical");
    if (criticalViolations.length === 0 || attempt >= MAX_RETRIES) {
      // Non-critical or max retries: return with flag notes
      const results = parseAIResponse(response.content);
      // Append flag info to academic explanation
      results.explanation.academic =
        `[⚠️ 自动审核提示：检测到 ${checkResult.violations.length} 处潜在问题] ` +
        results.explanation.academic;
      return results;
    }

    // Critical: retry with stricter constraints
    console.warn(`[Layer4] Hallucination check FAILED, retrying (${attempt + 1}/${MAX_RETRIES})`,
      criticalViolations);
    // The retry will use the same prompt but with different sampling (temperature=0.1)
  }

  // Shouldn't reach here, but fallback
  return parseAIResponse("");
}

function parseAIResponse(content: string): AIResults {
  try {
    const jsonStr = extractJson(content);
    const parsed = JSON.parse(jsonStr);

    const interp = parsed.interpretation ?? {};
    const report = parsed.reporting ?? {};

    // Build suggestions from evidence-traceable recommendations format
    const suggestions: AIAdvisorSuggestion[] = [];
    const recs = parsed.recommendations ?? [];
    for (const r of recs as Array<Record<string, unknown>>) {
      // New format: claim + interpretation + confidence
      const claim = (r.claim ?? r.issue ?? r.title ?? "") as string;
      const interp = (r.interpretation ?? "") as string;
      const conf = (r.confidence as string) ?? "";
      const confLabel = conf ? ` [证据: ${conf === "high" ? "充分" : conf === "moderate" ? "部分" : "有限"}]` : "";

      // Build evidence summary if present
      const evidence = r.evidence as Array<Record<string, unknown>> | undefined;
      const evSummary = evidence?.length
        ? "\n\n证据: " + evidence.map((e) =>
            `${e.metric}=${e.value} (${e.relation})`
          ).join("; ")
        : "";

      suggestions.push({
        severity: "info" as const,
        title: claim,
        detail: `${interp}${confLabel}${evSummary}`.trim(),
      });
    }

    // Fallback: old diagnostic format
    if (suggestions.length === 0 && parsed.diagnostic?.fixes) {
      const fixes = parsed.diagnostic.fixes as Array<Record<string, string>>;
      for (const f of fixes) {
        const level = String(f.level ?? "");
        const levelLabel = level === "data" ? "数据层面" : level === "questionnaire" ? "量表层面" : "分析层面";
        suggestions.push({ severity: "suggestion" as const, title: levelLabel, detail: String(f.action ?? "") });
      }
    }

    // Fallback: very old format
    if (suggestions.length === 0 && parsed.suggestions) {
      for (const s of parsed.suggestions as Array<Record<string, unknown>>) {
        suggestions.push({
          severity: (s.severity as "warning" | "suggestion" | "info") ?? "info",
          title: String(s.title ?? ""),
          detail: String(s.detail ?? ""),
        });
      }
    }

    return {
      explanation: {
        simple: interp.simple ?? interp.simple_summary ?? parsed.simple ?? "",
        academic: interp.academic ?? interp.academic_interpretation ?? parsed.academic ?? "",
      },
      suggestions,
      diagnosis: {
        lowReliabilityItems: parsed.diagnosis?.lowReliabilityItems ?? [],
        crossLoadingItems: parsed.diagnosis?.crossLoadingItems ?? [],
        reverseItemRisks: parsed.diagnosis?.reverseItemRisks ?? [],
      },
      apaResult: report.apa_result ?? parsed.apaResult ?? "",
      shortAPA: report.short_apa ?? parsed.shortAPA ?? "",
      interpretationConfidence: (parsed.confidence as "low" | "moderate" | "high") ?? undefined,
    };
  } catch {
    return {
      explanation: { simple: content.slice(0, 500), academic: "" },
      suggestions: [],
      diagnosis: { lowReliabilityItems: [], crossLoadingItems: [], reverseItemRisks: [] },
      apaResult: "",
      shortAPA: "",
    };
  }
}
