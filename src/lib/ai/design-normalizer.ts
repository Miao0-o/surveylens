// ============================================================
// Research Design Normalizer
// Extracts structured schema from free text input.
// Client-side heuristic version (no API needed).
// Full AI version runs via Claude when connected.
// ============================================================

import type { AnalysisIntent, ResearchDesign } from "@/types";

interface NormalizedDesign {
  researchGoal: string;
  outcomeVariables: string[];
  predictorVariables: string[];
  theoreticalFramework: string;
  hypotheses: string[];
  analysisIntent: AnalysisIntent;
  confidence: "high" | "medium" | "low";
  /** Fields that were inferred (not user-provided) — should be reviewable */
  inferredFields: string[];
}

const INTENT_PATTERNS: { pattern: RegExp; intent: AnalysisIntent }[] = [
  { pattern: /量表|问卷|信度|效度|验证性|因子结构|内部一致|Cronbach|alpha|KMO|Bartlett/i, intent: "validation" },
  { pattern: /探索|发现|结构|降维|聚类|潜在因子|维度提取/i, intent: "exploration" },
  { pattern: /预测|回归|分类|机器学习|训练|模型|forecast|predict/i, intent: "prediction" },
  { pattern: /解释|关系|影响|路径|中介|调节|因果|相关分析|假设检验/i, intent: "explanation" },
];

const FRAMEWORK_PATTERNS: { pattern: RegExp; framework: string }[] = [
  { pattern: /生物.心理.社会|biopsychosocial/i, framework: "生物-心理-社会模型" },
  { pattern: /认知行为|CBT|cognitive.behav/i, framework: "认知行为模型" },
  { pattern: /大五|五因素|big.five|OCEAN|人格特质/i, framework: "大五人格模型" },
  { pattern: /自我决定|self.determination|SDT|内在动机/i, framework: "自我决定理论" },
  { pattern: /社会认知|social.cognit|班杜拉|bandura/i, framework: "社会认知理论" },
  { pattern: /发展心理|developmental|毕生发展/i, framework: "发展心理学模型" },
];

/**
 * Normalize a ResearchDesign from potentially unstructured input.
 * Runs client-side — no API call needed.
 */
export function normalizeDesign(design: ResearchDesign): NormalizedDesign {
  const inferred: string[] = [];
  let confidence: NormalizedDesign["confidence"] = "high";

  // Build a combined text corpus from all free-text fields
  const corpus = [
    design.researchGoal,
    design.freeNotes,
    design.hypotheses,
    design.theoreticalFramework,
  ].filter(Boolean).join("\n");

  // 1. Analysis Intent (from user selection or text inference)
  let analysisIntent = design.analysisIntent;
  if (!corpus) {
    // No text to infer from — keep user's selection
    inferred.push("analysisIntent");
  } else if (!design.analysisIntent || design.analysisIntent === "validation") {
    // Try to infer from text
    for (const { pattern, intent } of INTENT_PATTERNS) {
      if (pattern.test(corpus)) {
        if (intent !== design.analysisIntent) {
          analysisIntent = intent;
          inferred.push("analysisIntent");
          confidence = "medium";
        }
        break;
      }
    }
  }

  // 2. Theoretical Framework (from user selection or text inference)
  let framework = design.theoreticalFramework;
  if (corpus && !framework) {
    for (const { pattern, framework: fw } of FRAMEWORK_PATTERNS) {
      if (pattern.test(corpus)) {
        framework = fw;
        inferred.push("theoreticalFramework");
        confidence = "medium";
        break;
      }
    }
  }

  // 3. Hypotheses — extract numbered statements
  let hypotheses: string[] = [];
  if (design.hypotheses) {
    hypotheses = design.hypotheses
      .split(/[；;。\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);
  } else if (corpus) {
    // Try to extract hypothesis-like statements from corpus
    const hMatches = corpus.match(/(?:H\d|假设\d?)[：:]\s*(.+?)(?=[；;。\n]|$)/gi);
    if (hMatches) {
      hypotheses = hMatches.map((h) => h.replace(/^H\d?\s*[：:]\s*/i, "").trim());
      inferred.push("hypotheses");
      confidence = "medium";
    }
  }

  // 4. Research goal — extract from corpus if not explicitly set
  let goal = design.researchGoal;
  if (!goal && corpus) {
    const firstSentence = corpus.split(/[。；\n]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 5) {
      goal = firstSentence;
      inferred.push("researchGoal");
      confidence = "low";
    }
  }

  return {
    researchGoal: goal,
    outcomeVariables: design.outcomeVariables,
    predictorVariables: design.predictorVariables,
    theoreticalFramework: framework,
    hypotheses,
    analysisIntent,
    confidence,
    inferredFields: inferred,
  };
}

/**
 * Generate the AI system prompt section for design normalization.
 * Used when Claude API is connected — provides stronger extraction.
 */
export const DESIGN_NORMALIZER_PROMPT = `
# Research Design Normalization

Before any data analysis, extract and normalize the research design into a structured schema.

Return a JSON object with:
- research_goal: string | null
- outcome_variables: string[]
- predictor_variables: string[]
- theoretical_framework: string | null
- hypotheses: string[] | null
- analysis_intent: "prediction" | "explanation" | "exploration" | "validation"

Rules:
1. Convert unstructured text into schema format where possible.
2. If information is missing, set the field to null (do not guess).
3. This schema will be editable by the user — treat it as a draft.
4. Do not invent variables not present in the input.
5. Do not change user-selected fields unless clearly contradicted.

Output ONLY valid JSON, no explanation.
`;

/**
 * Run AI-powered normalization via Claude API.
 * Falls back to client-side heuristic if AI is unavailable.
 */
export async function aiNormalizeDesign(
  design: ResearchDesign,
  apiKey?: string
): Promise<NormalizedDesign> {
  // If no API key, use client-side heuristic
  if (!apiKey?.startsWith("sk-ant")) {
    return normalizeDesign(design);
  }

  try {
    const res = await fetch("http://localhost:8000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        system_prompt: DESIGN_NORMALIZER_PROMPT,
        user_message: JSON.stringify(design, null, 2),
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!res.ok) throw new Error("API call failed");
    const data = await res.json();
    const jsonStr = extractJson(data.content);
    const parsed = JSON.parse(jsonStr);

    return {
      researchGoal: parsed.research_goal ?? design.researchGoal,
      outcomeVariables: parsed.outcome_variables ?? design.outcomeVariables,
      predictorVariables: parsed.predictor_variables ?? design.predictorVariables,
      theoreticalFramework: parsed.theoretical_framework ?? design.theoreticalFramework,
      hypotheses: parsed.hypotheses ?? (design.hypotheses ? [design.hypotheses] : []),
      analysisIntent: parsed.analysis_intent ?? design.analysisIntent,
      confidence: "high",
      inferredFields: Object.keys(parsed).filter((k) => parsed[k] !== null && parsed[k] !== undefined),
    };
  } catch {
    return normalizeDesign(design);
  }
}

function extractJson(content: string): string {
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? content.match(/\{[\s\S]*\}/);
  return match ? (match[1] ?? match[0]).trim() : content.trim();
}
