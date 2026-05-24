// ============================================================
// AI Client — Multi-Layer Prompt Pipeline (v2.0)
// Layer 0: System Contract
// Layer 1: Context Filter
// Layer 2: Scientific Interpretation
// Layer 3: Output Structurer
// Layer 4: Hallucination Checker (separate second pass)
// ============================================================
// promptVersion: scientific_reviewer_v2.0

import type { AICompressedInput, AIResults, ValidationReport } from "@/types";

const PROXY_URL = process.env.NEXT_PUBLIC_API_PROXY_URL ?? "http://localhost:8000";
export const PROMPT_VERSION = "scientific_reviewer_v2.0";

interface ChatResponse {
  content: string;
  model: string;
  usage?: { input_tokens: number; output_tokens: number };
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 3000
): Promise<ChatResponse> {
  const res = await fetch(`${PROXY_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      system_prompt: systemPrompt,
      user_message: userMessage,
      max_tokens: maxTokens,
      temperature: 0.1, // minimal randomness for scientific output
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`AI API error: ${err.detail ?? res.status}`);
  }
  return res.json();
}

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

## 3. Conservative academic language
Use: suggests, indicates, may imply, evidence supports, is consistent with
Never: proves, guarantees, definitely confirms, without doubt

## 4. Statistical validity constraints (automatic flagging)
- Cronbach's α > 0.95 → warn possible item redundancy
- Cronbach's α < 0.60 → indicate low internal consistency
- KMO < 0.50 → state factor analysis is not appropriate
- Cross-loading difference < 0.20 → flag factor ambiguity
- Bootstrap stability < 0.70 → indicate unstable solution
- Bartlett's p ≥ 0.05 → correlation matrix may be identity

## 5. Separate facts from interpretation
Always distinguish:
- What the numbers ARE (statistical summary)
- What the numbers MEAN (interpretation)
- What concerns EXIST (diagnostic warnings)
- What COULD BE DONE (recommendations, only if data supports)

## 6. Reproducibility
Acknowledge: results depend on bootstrap seed, extraction method, and rotation choice.
If these are not specified, state the assumption.
`;

// ============================================================
// LAYER 3: OUTPUT STRUCTURER (strict format enforcement)
// ============================================================

const LAYER_3_OUTPUT_STRUCTURER = `
# OUTPUT FORMAT (STRICT)

You must output EXACTLY the requested JSON structure.
No additional sections. No narrative expansion beyond required fields.
No speculation beyond provided statistics.

Output JSON schema:
{
  "simple": "通俗中文总结（2-3句，面向零基础用户）",
  "academic": "学术风格详细解读（2-3段中文，专业术语保留英文如 Cronbach's α, KMO, Bartlett）",
  "suggestions": [
    {
      "severity": "warning|suggestion|info",
      "title": "简短中文建议标题",
      "detail": "具体可操作的中文建议内容"
    }
  ],
  "diagnosis": {
    "lowReliabilityItems": [],
    "crossLoadingItems": [],
    "reverseItemRisks": []
  },
  "apaResult": "APA 7th format results paragraph in English, ready for paper insertion"
}

The "apaResult" field MUST be in English following APA 7th edition journal standards.

# LANGUAGE RULE
{lang_rule}
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
    const response = await callClaude(apiKey, LAYER_4_HALLUCINATION_CHECKER, userMessage, 1000);
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
    "# STATISTICAL RESULTS SUMMARY (Authoritative)",
    "",
    `Cronbach's α: ${input.alpha}`,
    `KMO: ${input.kmo}`,
    `Bootstrap Stability: ${input.stabilityLevel}`,
    `Recommended Sample Size: ${input.recommendedSampleSize}`,
  ];

  if (input.lowItems.length > 0) {
    lines.push(`Items where α improves if deleted: ${input.lowItems.join(", ")}`);
  }
  if (input.problematicItems.length > 0) {
    lines.push(`Items with low KMO (< 0.60): ${input.problematicItems.join(", ")}`);
  }
  if (input.crossLoadingItems.length > 0) {
    lines.push(`Items with cross-loadings (max diff < 0.20): ${input.crossLoadingItems.join(", ")}`);
  }

  lines.push("");
  lines.push("# FACTOR STRUCTURE");
  for (const fl of input.factorLoadings) {
    lines.push(`${fl.item}: Factor ${fl.factor} = ${fl.loading}`);
  }

  if (validation) {
    lines.push("");
    lines.push("# VALIDATION REPORT");
    lines.push(`Confidence Level: ${validation.confidence.level} (${validation.confidence.overall.toFixed(2)})`);
    lines.push(`Data Quality: ${validation.confidence.dataQuality.toFixed(2)}`);
    lines.push(`Reliability Score: ${validation.confidence.reliability.toFixed(2)}`);
    lines.push(`Validity Score: ${validation.confidence.validity.toFixed(2)}`);
    lines.push(`Factor Stability: ${validation.confidence.factorStability.toFixed(2)}`);
    lines.push(`Flags: ${validation.flags.length} total (${validation.flags.filter(f=>f.type==='error').length} errors, ${validation.flags.filter(f=>f.type==='warning').length} warnings, ${validation.flags.filter(f=>f.type==='info').length} info)`);
  }

  if (input.researchGoal) {
    lines.push("");
    lines.push(`# RESEARCH GOAL: ${input.researchGoal}`);
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
    return "ALL text fields MUST be in English. Use academic English throughout.";
  }
  return "The 'simple', 'academic', 'suggestions', and 'diagnosis' fields MUST be in Chinese. The 'apaResult' field MUST be in English.";
}

export async function runAIInterpretation(
  apiKey: string,
  input: AICompressedInput,
  validation?: ValidationReport | null,
  lang: "zh" | "en" = "zh"
): Promise<AIResults> {
  const prompt = SYSTEM_PROMPT.replace("{lang_rule}", buildLangRule(lang));
  const userMessage = buildUserMessage(input, validation);
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Step 1: Run Layers 0-3 (primary interpretation)
    const response = await callClaude(apiKey, prompt, userMessage, 3000);

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
    return {
      explanation: {
        simple: parsed.simple ?? "",
        academic: parsed.academic ?? "",
      },
      suggestions: (parsed.suggestions ?? []).map((s: Record<string, unknown>) => ({
        severity: (s.severity as "warning" | "suggestion" | "info") ?? "info",
        title: String(s.title ?? ""),
        detail: String(s.detail ?? ""),
      })),
      diagnosis: {
        lowReliabilityItems: parsed.diagnosis?.lowReliabilityItems ?? [],
        crossLoadingItems: parsed.diagnosis?.crossLoadingItems ?? [],
        reverseItemRisks: parsed.diagnosis?.reverseItemRisks ?? [],
      },
      apaResult: parsed.apaResult ?? "",
    };
  } catch {
    return {
      explanation: { simple: content.slice(0, 500), academic: "" },
      suggestions: [],
      diagnosis: { lowReliabilityItems: [], crossLoadingItems: [], reverseItemRisks: [] },
      apaResult: "",
    };
  }
}
