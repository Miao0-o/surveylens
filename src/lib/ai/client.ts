// ============================================================
// AI Client — calls Claude API via FastAPI proxy
// promptVersion: scientific_reviewer_v1.0
// Source: backend/ai/prompts/scientific_reviewer.txt
// ============================================================

import type { AICompressedInput, AIResults } from "@/types";

const PROXY_URL = process.env.NEXT_PUBLIC_API_PROXY_URL ?? "http://localhost:8000";
export const PROMPT_VERSION = "scientific_reviewer_v1.0";

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
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`AI API error: ${err.detail ?? res.status}`);
  }

  return res.json();
}

// ============================================================
// SYSTEM PROMPT — Scientific Reviewer v1.0
// Synced with backend/ai/prompts/scientific_reviewer.txt
// ============================================================

const SYSTEM_PROMPT = `You are a scientific-grade psychometric analysis engine.

Your task is to interpret and validate statistical analysis results from a psychometric dataset, including reliability, validity, and factor analysis outputs.

You DO NOT perform any computation or modify any data. You ONLY interpret provided results.

# CRITICAL RULES (NON-NEGOTIABLE)

1. NEVER modify data or recompute statistics — no imputation, no factor structure adjustments, no rescaling.
2. Treat all statistical outputs as ground truth — Cronbach's alpha, KMO, Bartlett's test, factor loadings, eigenvalues, bootstrap results, item-total correlations are authoritative.
3. Base ALL conclusions ONLY on provided data — if information is missing, state: "Insufficient information to evaluate this aspect."
4. Use conservative academic language — "suggests", "indicates", "may imply", "evidence supports". NEVER: "proves", "guarantees", "definitely confirms".
5. Respect statistical validity constraints:
   - alpha > 0.95 → warn possible redundancy
   - alpha < 0.60 → indicate low internal consistency
   - KMO < 0.50 → state factor analysis is not appropriate
   - cross-loading difference < 0.20 → flag ambiguity
6. NEVER fabricate numerical results — if absent, explicitly say "Not available in provided results".
7. Separate interpretation from recommendation: (1) Statistical Summary, (2) Interpretation, (3) Diagnostic Warnings, (4) Recommendations.
8. Acknowledge reproducibility — mention bootstrap seed, extraction method, rotation type if provided.
9. Do NOT act as a data scientist — do not choose number of factors, rerun analysis, or override user-defined structure.

# OUTPUT FORMAT (STRICT JSON)

You must output valid JSON with this exact structure.
Use Chinese for explanations, keep academic terms in English (Cronbach's α, KMO, Bartlett).
APA results in English.

{
  "simple": "通俗易懂的总结（2-3句话，面向零基础用户，中文）",
  "academic": "学术风格的详细解读（2-3段，含关键指标数值和解释，中文撰写，术语保留英文）",
  "suggestions": [
    {
      "severity": "warning|suggestion|info",
      "title": "简短的建议标题（中文）",
      "detail": "具体建议内容（中文，基于数据，有可操作性）"
    }
  ],
  "diagnosis": {
    "lowReliabilityItems": ["题项标识符..."],
    "crossLoadingItems": ["题项标识符..."],
    "reverseItemRisks": ["题项标识符..."]
  },
  "apaResult": "可直接复制到论文中的 APA 格式结果段落（英文，符合 APA 7th 期刊规范）"
}`;

function buildUserMessage(input: AICompressedInput): string {
  const lines: string[] = [
    "## Statistical Results Summary",
    "",
    `- Cronbach's α: ${input.alpha}`,
    `- KMO: ${input.kmo}`,
    `- Stability: ${input.stabilityLevel}`,
    `- Recommended N: ${input.recommendedSampleSize}`,
  ];

  if (input.lowItems.length > 0) {
    lines.push(`- Items where alpha improves if deleted: ${input.lowItems.join(", ")}`);
  }
  if (input.problematicItems.length > 0) {
    lines.push(`- Items with low KMO: ${input.problematicItems.join(", ")}`);
  }
  if (input.crossLoadingItems.length > 0) {
    lines.push(`- Items with cross-loadings: ${input.crossLoadingItems.join(", ")}`);
  }

  lines.push("");
  lines.push("## Factor Structure");
  for (const fl of input.factorLoadings) {
    lines.push(`- ${fl.item}: Factor ${fl.factor} loading = ${fl.loading}`);
  }

  if (input.researchGoal) {
    lines.push("");
    lines.push(`## Research Goal: ${input.researchGoal}`);
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

export async function runAIInterpretation(
  apiKey: string,
  input: AICompressedInput
): Promise<AIResults> {
  const userMessage = buildUserMessage(input);
  const response = await callClaude(apiKey, SYSTEM_PROMPT, userMessage, 3000);

  try {
    const jsonStr = extractJson(response.content);
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
  } catch (err) {
    console.error("Failed to parse AI response:", err);
    return {
      explanation: {
        simple: response.content.slice(0, 500),
        academic: "",
      },
      suggestions: [],
      diagnosis: {
        lowReliabilityItems: [],
        crossLoadingItems: [],
        reverseItemRisks: [],
      },
      apaResult: "",
    };
  }
}
