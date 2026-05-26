// ============================================================
// LLM Router — provider detection + single-provider routing
//
// Key prefix determines access:
//   sk-or-v1-...  → OpenRouter (multi-model: Claude, GPT, Gemini, DeepSeek)
//   sk-ant-...    → Anthropic direct (Claude models only)
//   sk-...        → OpenAI direct (GPT models only)
//   AIza...        → Google Gemini direct
// ============================================================

const SITE_NAME = "SurveyLens";
const SITE_URL = "https://miao0-o.github.io/reliability-analysis-system";

export interface LLMRequest {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  model?: string;
  /** Override auto-detected provider */
  provider?: LLMProvider;
  /** Strict mode: block if provider≠key */
  strictMode?: boolean;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  source?: "user_selection" | "store" | "auto_detect";
  usage?: { input_tokens: number; output_tokens: number };
}

export type LLMProvider = "openrouter" | "anthropic" | "openai" | "gemini" | "deepseek";

/** Detect provider from API key prefix */
export function detectProvider(apiKey: string): LLMProvider | null {
  if (apiKey.startsWith("sk-or-")) return "openrouter";
  if (apiKey.startsWith("sk-ant-")) return "anthropic";
  if (apiKey.startsWith("sk-") && !apiKey.startsWith("sk-ant-") && !apiKey.startsWith("sk-or-")) return "openai";
  if (apiKey.startsWith("AIza")) return "gemini";
  return null;
}

// ---- Canonical model layer ----
// User sees: Claude, GPT, Gemini, DeepSeek
// System resolves: canonical → provider-specific model ID

export type CanonicalModel = "claude" | "gpt" | "gemini" | "deepseek";

export const CANONICAL_MODELS: { id: CanonicalModel; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "gpt", label: "GPT" },
  { id: "gemini", label: "Gemini" },
  { id: "deepseek", label: "DeepSeek" },
];

/** Canonical models available per provider */
export const CANONICAL_BY_PROVIDER: Record<LLMProvider, CanonicalModel[]> = {
  openrouter: ["claude", "gpt", "gemini", "deepseek"],
  anthropic:  ["claude"],
  openai:     ["gpt"],
  gemini:     ["gemini"],
  deepseek:   ["deepseek"],
};

/** Default canonical model per provider */
export const DEFAULT_CANONICAL: Record<LLMProvider, CanonicalModel> = {
  openrouter: "claude",
  anthropic: "claude",
  openai: "gpt",
  gemini: "gemini",
  deepseek: "deepseek",
};

/** Resolve canonical model → provider-specific model ID */
export function resolveModel(provider: LLMProvider, canonical: CanonicalModel): string {
  const map: Record<LLMProvider, Record<CanonicalModel, string>> = {
    openrouter: { claude: "anthropic/claude-sonnet-4.6", gpt: "openai/gpt-4o", gemini: "google/gemini-2.5-pro", deepseek: "deepseek/deepseek-chat" },
    anthropic:  { claude: "claude-sonnet-4-20250514", gpt: "gpt-4o", gemini: "gemini-2.5-pro", deepseek: "deepseek/deepseek-chat" },
    openai:     { claude: "claude-sonnet-4-20250514", gpt: "gpt-4o", gemini: "gemini-2.5-pro", deepseek: "deepseek-chat" },
    gemini:     { claude: "claude-sonnet-4-20250514", gpt: "gpt-4o", gemini: "gemini-2.5-pro", deepseek: "deepseek-chat" },
    deepseek:   { claude: "deepseek-chat", gpt: "deepseek-chat", gemini: "deepseek-chat", deepseek: "deepseek-chat" },
  };
  return map[provider][canonical];
}

// ---- Backward compat: full model lists ----
export const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  openrouter: ["anthropic/claude-sonnet-4.6", "openai/gpt-4o", "google/gemini-2.5-pro", "deepseek/deepseek-chat"],
  anthropic:  ["claude-sonnet-4-20250514", "claude-haiku-4-20250514"],
  openai:     ["gpt-4o", "gpt-4o-mini"],
  gemini:     ["gemini-2.5-pro", "gemini-2.0-flash"],
  deepseek:   ["deepseek-chat"],
};

/** Human-readable provider name */
export function providerLabel(p: LLMProvider): string {
  return { openrouter: "OpenRouter", anthropic: "Anthropic", openai: "OpenAI", gemini: "Google Gemini", deepseek: "DeepSeek" }[p];
}

type ProviderFn = (apiKey: string, req: LLMRequest) => Promise<LLMResponse>;

// ---- OpenRouter Adapter (multi-model via single API) ----

async function openRouterCall(apiKey: string, req: LLMRequest): Promise<LLMResponse> {
  const model = req.model ?? "anthropic/claude-sonnet-4.6";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": SITE_URL,
      "X-Title": SITE_NAME,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: req.systemPrompt },
        { role: "user", content: req.userMessage },
      ],
      max_tokens: req.maxTokens ?? 3000,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (err.error as Record<string, string>)?.message ?? `HTTP ${res.status}`;
    throw new Error(`OpenRouter: ${msg}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const choice = ((data.choices as Array<Record<string, unknown>>)?.[0]) ?? {};
  return {
    content: ((choice.message as Record<string, string>)?.content) ?? "",
    model: (data.model as string) ?? model,
    provider: "openrouter",
    usage: data.usage as { input_tokens: number; output_tokens: number } | undefined,
  };
}

// ---- Anthropic Direct Adapter (Claude only) ----

async function anthropicDirectCall(apiKey: string, req: LLMRequest): Promise<LLMResponse> {
  const model = req.model ?? "claude-sonnet-4-20250514";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 3000,
      temperature: 0.1,
      system: req.systemPrompt,
      messages: [{ role: "user", content: req.userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (err.error as Record<string, string>)?.message ?? `HTTP ${res.status}`;
    throw new Error(`Anthropic: ${msg}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const content = (data.content as Array<Record<string, unknown>>)?.[0];
  return {
    content: (content?.text as string) ?? "",
    model: (data.model as string) ?? model,
    provider: "anthropic",
    usage: data.usage as { input_tokens: number; output_tokens: number } | undefined,
  };
}

// ---- OpenAI Direct Adapter (GPT only) ----

async function openaiDirectCall(apiKey: string, req: LLMRequest): Promise<LLMResponse> {
  const model = req.model ?? "gpt-4o";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: req.systemPrompt },
        { role: "user", content: req.userMessage },
      ],
      max_tokens: req.maxTokens ?? 3000,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (err.error as Record<string, string>)?.message ?? `HTTP ${res.status}`;
    throw new Error(`OpenAI: ${msg}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const choice = ((data.choices as Array<Record<string, unknown>>)?.[0]) ?? {};
  return {
    content: ((choice.message as Record<string, string>)?.content) ?? "",
    model: (data.model as string) ?? model,
    provider: "openai",
    usage: data.usage as { input_tokens: number; output_tokens: number } | undefined,
  };
}

// ---- Provider registry ----

// DeepSeek adapter — OpenAI-compatible, different endpoint
async function deepseekCall(apiKey: string, req: LLMRequest): Promise<LLMResponse> {
  const model = req.model ?? "deepseek-chat";
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: req.systemPrompt },
        { role: "user", content: req.userMessage },
      ],
      max_tokens: req.maxTokens ?? 3000,
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (err.error as Record<string, string>)?.message ?? `HTTP ${res.status}`;
    throw new Error(`DeepSeek: ${msg}`);
  }
  const data = await res.json() as Record<string, unknown>;
  const choice = ((data.choices as Array<Record<string, unknown>>)?.[0]) ?? {};
  return {
    content: ((choice.message as Record<string, string>)?.content) ?? "",
    model: (data.model as string) ?? model,
    provider: "deepseek",
    usage: data.usage as { input_tokens: number; output_tokens: number } | undefined,
  };
}

const PROVIDER_MAP: Record<LLMProvider, ProviderFn> = {
  openrouter: openRouterCall,
  anthropic:  anthropicDirectCall,
  openai:     openaiDirectCall,
  gemini:     openaiDirectCall,
  deepseek:   deepseekCall,
};

/**
 * Call LLM with automatic provider routing.
 * Key prefix determines WHICH provider is used.
 * A key only works with its matching provider — no cross-provider fallback.
 */
export async function llmCall(apiKey: string, req: LLMRequest): Promise<LLMResponse> {
  // Priority: request override > auto-detect
  const autoDetected = detectProvider(apiKey);
  const provider = req.provider ?? autoDetected;

  // Safety check: warn or block if selected provider doesn't match key format
  if (req.provider && autoDetected && req.provider !== autoDetected) {
    if (req.strictMode) {
      throw new Error(
        `Strict mode: provider "${req.provider}" does not match API key format "${autoDetected}". ` +
        `Disable strict mode or use a matching key.`
      );
    }
    console.warn(`[llm-router] Provider mismatch: selected "${req.provider}" but key appears to be "${autoDetected}". Using selected provider.`);
  }

  if (!provider) {
    throw new Error(
      "Unrecognized API key format. Supported keys:\n" +
      "  sk-or-v1-... (OpenRouter — multi-model)\n" +
      "  sk-ant-...   (Anthropic — Claude only)\n" +
      "  sk-...       (OpenAI — GPT only)"
    );
  }

  // Resolve canonical model → provider-specific model ID
  if (req.model && CANONICAL_MODELS.some(m => m.id === req.model)) {
    req = { ...req, model: resolveModel(provider, req.model as CanonicalModel) };
  }

  const source = req.provider ? "user_selection" : "auto_detect";

  // Route to EXACTLY one provider — no cross-provider fallback.
  const fn = PROVIDER_MAP[provider];
  try {
    const result = await fn(apiKey, req);
    return { ...result, source };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${providerLabel(provider)}: ${msg}`);
  }
}
