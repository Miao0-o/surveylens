// ============================================================
// AI Client — calls Claude API via FastAPI proxy
// Structured prompts → structured JSON output
// ============================================================

import type { AICompressedInput, AIResults } from "@/types";

const PROXY_URL = process.env.NEXT_PUBLIC_API_PROXY_URL ?? "http://localhost:8000";

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

const SYSTEM_PROMPT = `你是一位资深的心理测量学与学术研究方法论顾问。你的任务是根据提供的统计分析结果，生成结构化的解读和建议。

你必须严格遵循以下规则：
1. 所有输出必须是有效的 JSON 格式
2. 使用中文撰写，学术术语保留英文原文（如 Cronbach's α, KMO, Bartlett）
3. APA 格式结果保留英文（符合国际期刊规范）
4. 不要编造数据中不存在的发现
5. 解读要同时兼顾学术严谨性和通俗易懂性
6. 建议要具体、有可操作性，不要说空话

输出 JSON 结构：
{
  "simple": "通俗易懂的总结（2-3句话，面向零基础用户）",
  "academic": "学术风格的详细解读（2-3段，含关键指标数值和解释）",
  "suggestions": [
    {
      "severity": "warning|suggestion|info",
      "title": "建议标题（简短）",
      "detail": "具体建议内容"
    }
  ],
  "diagnosis": {
    "lowReliabilityItems": ["题项标识符..."],
    "crossLoadingItems": ["题项标识符..."],
    "reverseItemRisks": ["题项标识符..."]
  },
  "apaResult": "可直接复制到论文中的 APA 格式结果段落（英文）"
}`;

function buildUserMessage(input: AICompressedInput): string {
  const lines: string[] = [
    "## 统计分析结果摘要",
    "",
    `- Cronbach's α: ${input.alpha}`,
    `- KMO: ${input.kmo}`,
    `- 样本稳定性: ${input.stabilityLevel}`,
    `- 推荐样本量: ${input.recommendedSampleSize}`,
  ];

  if (input.lowItems.length > 0) {
    lines.push(`- 删除后可提升信度的题项: ${input.lowItems.join(", ")}`);
  }
  if (input.problematicItems.length > 0) {
    lines.push(`- KMO 偏低的题项: ${input.problematicItems.join(", ")}`);
  }
  if (input.crossLoadingItems.length > 0) {
    lines.push(`- 存在交叉载荷的题项: ${input.crossLoadingItems.join(", ")}`);
  }

  lines.push("");
  lines.push("## 因子载荷结构");
  for (const fl of input.factorLoadings) {
    lines.push(`- ${fl.item}: 因子${fl.factor} 载荷 = ${fl.loading}`);
  }

  if (input.researchGoal) {
    lines.push("");
    lines.push(`## 研究目标`);
    lines.push(input.researchGoal);
  }

  return lines.join("\n");
}

function extractJson(content: string): string {
  // Handle cases where Claude wraps JSON in markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) return jsonMatch[1].trim();

  // Try to find { ... } directly
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
    // Return partial results on parse failure
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
