"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { CANONICAL_BY_PROVIDER, DEFAULT_CANONICAL, CANONICAL_MODELS } from "@/lib/ai/llm-router";
import { ArrowLeft, Check, Info, Loader2, Shield, Sparkles, Zap } from "lucide-react";

export default function AISettingsPage() {
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const aiMode = useAppStore((s) => s.aiMode);
  const setAIMode = useAppStore((s) => s.setAIMode);
  const aiModel = useAppStore((s) => s.aiModel);
  const setAIModel = useAppStore((s) => s.setAIModel);
  const aiProvider = useAppStore((s) => s.aiProvider);
  const setAIProvider = useAppStore((s) => s.setAIProvider);
  const aiStrictMode = useAppStore((s) => s.aiStrictMode);
  const setAIStrictMode = useAppStore((s) => s.setAIStrictMode);
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "fail" | null>(null);

  const autoProvider = apiKey ? (apiKey.startsWith("sk-or-") ? "openrouter" : apiKey.startsWith("sk-ant-") ? "anthropic" : apiKey.startsWith("sk-") ? "openai" : null) : null;
  const provider = (aiProvider || autoProvider || null) as "openrouter" | "anthropic" | "openai" | "deepseek" | null;
  const hasKey = apiKey && apiKey.length > 10;
  // Loose coupling: provider≠key is allowed, but warn the user
  const providerMismatch = aiProvider && autoProvider && aiProvider !== autoProvider;

  useEffect(() => {
    if (provider && DEFAULT_CANONICAL[provider]) setAIModel(DEFAULT_CANONICAL[provider]);
  }, [provider, setAIModel]);

  const availableCanonical = provider ? CANONICAL_BY_PROVIDER[provider] : [];
  const defaultCanonical = provider ? DEFAULT_CANONICAL[provider] : null;

  const providerInfo = provider === "openrouter" ? {
    name: "OpenRouter", models: "Claude · GPT · Gemini · DeepSeek", testUrl: "https://openrouter.ai/api/v1/models",
  } : provider === "anthropic" ? {
    name: "Anthropic", models: en ? "Claude only" : "仅 Claude", testUrl: "https://api.anthropic.com/v1/messages",
  } : provider === "openai" ? {
    name: "OpenAI", models: en ? "GPT only" : "仅 GPT", testUrl: "https://api.openai.com/v1/models",
  } : provider === "deepseek" ? {
    name: "DeepSeek", models: en ? "DeepSeek only" : "仅 DeepSeek", testUrl: "https://api.deepseek.com/v1/chat/completions",
  } : null;

  const handleTestConnection = async () => {
    if (!provider || !providerInfo) return;
    setTesting(true); setTestResult(null);
    try {
      const headers: Record<string, string> = provider === "anthropic"
        ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
        : { "Authorization": `Bearer ${apiKey}` };
      const testBody = (provider === "anthropic" || provider === "deepseek")
        ? JSON.stringify({ model: provider === "deepseek" ? "deepseek-chat" : "claude-haiku-4-20250514", max_tokens: 1, messages: [{ role: "user", content: "hi" }] })
        : null;
      const res = await fetch(providerInfo.testUrl, {
        method: testBody ? "POST" : "GET",
        headers: { "Content-Type": "application/json", ...headers },
        body: testBody,
      });
      if (res.ok) { setTestResult("success"); setAIMode("connected"); }
      else { setTestResult("fail"); setAIMode("offline"); }
    } catch { setTestResult("fail"); setAIMode("offline"); }
    finally { setTesting(false); }
  };

  const features = en
    ? ["Statistical interpretation", "Low-reliability item diagnosis", "Factor structure suggestions", "Scale improvement considerations", "Reverse-item risk detection", "APA 7th format results"]
    : ["统计指标自动解读", "低信度题项诊断", "因子结构建议", "量表优化考量", "反向题风险识别", "APA 论文结果生成"];

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <header className="h-14 border-b border-border bg-card flex items-center px-6 shrink-0 gap-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          {en ? "Back" : "返回"}
        </Link>
        <span className="text-sm font-semibold text-foreground">{en ? "AI Settings" : "AI 设置"}</span>
        {aiMode === "connected" && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {en ? "Connected" : "已连接"}
          </span>
        )}
        {aiMode === "offline" && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {en ? "Not connected" : "未连接"}
          </span>
        )}
      </header>

      <main className="max-w-xl mx-auto px-6 py-12 space-y-8">
        <div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {en
              ? "SurveyLens sends statistical summaries (not raw data) directly from your browser to your chosen LLM provider. OpenRouter (recommended) provides multi-model access (Claude, GPT, Gemini, DeepSeek). Direct provider keys are also supported but limited to that provider's models."
              : "SurveyLens 将统计摘要（非原始数据）从浏览器直接发送到您选择的 LLM 提供商。OpenRouter（推荐）提供多模型访问（Claude、GPT、Gemini、DeepSeek）。也支持直接使用提供商密钥，但仅限该提供商的模型。"}
          </p>
        </div>

        <div className="rounded-xl bg-blue-50/40 border border-blue-100/50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
            <span className="text-sm font-medium text-blue-700">{en ? "Privacy & Security" : "隐私与安全"}</span>
          </div>
          <ul className="text-xs text-blue-600/80 space-y-1 ml-6">
            <li>{en ? "Raw survey data never leaves your browser" : "原始问卷数据绝不会上传"}</li>
            <li>{en ? "All statistical computation is local" : "所有统计分析在浏览器本地完成"}</li>
            <li>{en ? "AI only receives a statistical summary (~500 chars)" : "AI 仅接收统计摘要（约 500 字符）"}</li>
            <li>{en ? "API key stored only in current browser session" : "API Key 仅存储在当前浏览器会话中"}</li>
            <li>{en ? "BYOK model: your key, your usage, your billing" : "BYOK 模式：自有密钥，自有用量，自有账单"}</li>
          </ul>
          <p className="text-[10px] text-blue-500/60 mt-2">
            {en
              ? "Note: As with any browser-based API client, your key is visible in the Network tab. This is inherent to BYOK architecture — not suitable for untrusted shared devices."
              : "注意：与任何基于浏览器的 API 客户端一样，您的密钥在网络标签页中可见。这是 BYOK 架构的固有特性——不适合不受信任的共享设备。"}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">{en ? "AI Features" : "AI 功能"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-400" strokeWidth={2} />
                {f}
              </div>
            ))}
          </div>
        </div>

        <hr className="border-border" />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">{en ? "How to get an API key" : "如何获取 API Key"}</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-2 ml-6">
            <div>
              <p className="font-medium text-foreground/80">{en ? "Recommended: OpenRouter" : "推荐：OpenRouter"}</p>
              <p><a href="https://openrouter.ai/keys" target="_blank" rel="noopener" className="text-primary underline">openrouter.ai/keys</a> → {en ? "key starts with" : "密钥以"} <code className="text-[11px] bg-secondary/50 px-1 rounded">sk-or-v1-</code> {en ? "begins" : "开头"}</p>
              <p className="text-muted-foreground/60">{en ? "Multi-model access (Claude, GPT, Gemini, DeepSeek). ~$1-2 for many analyses." : "多模型访问（Claude、GPT、Gemini、DeepSeek）。约 $1-2 即可支持多次分析。"}</p>
            </div>
            <div>
              <p className="font-medium text-foreground/80">{en ? "Also supported: Direct provider keys" : "也支持：直接提供商密钥"}</p>
              <p><code className="text-[11px] bg-secondary/50 px-1 rounded">sk-ant-</code> → Anthropic ({en ? "Claude only" : "仅 Claude"}) · <code className="text-[11px] bg-secondary/50 px-1 rounded">sk-</code> → OpenAI/DeepSeek ({en ? "select provider manually" : "手动选择提供商"})</p>
              <p className="text-muted-foreground/60">{en ? "Direct keys may have CORS restrictions in browser. OpenRouter is recommended." : "直接密钥在浏览器中可能有 CORS 限制。推荐使用 OpenRouter。"}</p>
            </div>
          </div>
        </div>

        {/* Manual provider selector for ambiguous keys */}
        <div className="space-y-2">
          <label className="text-[10px] text-muted-foreground">
            {en ? "Provider (auto-detected, override if incorrect)" : "提供商（自动检测，可手动覆盖）"}
          </label>
          <select
            value={provider ?? ""}
            onChange={(e) => setAIProvider(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">{en ? "Auto-detect" : "自动检测"}</option>
            <option value="openrouter">OpenRouter (sk-or-v1-)</option>
            <option value="anthropic">Anthropic (sk-ant-)</option>
            <option value="openai">OpenAI (sk-)</option>
            <option value="deepseek">DeepSeek (sk-)</option>
          </select>
          {providerMismatch && (
            <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mt-1.5">
              {en
                ? `Note: selected "${aiProvider}" but key appears to be "${autoProvider}". Allowed, but may cause request failure if the key doesn't work with ${aiProvider}'s API.`
                : `注意：选择了"${aiProvider}"，但密钥似乎为"${autoProvider}"。允许运行，但如果密钥不适用于 ${aiProvider} 的 API，请求可能失败。`}
            </p>
          )}
          {/* Strict mode toggle */}
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={aiStrictMode}
              onChange={(e) => setAIStrictMode(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-[10px] text-muted-foreground">
              {en ? "Strict mode: block requests if provider≠key" : "严格模式：provider 与 key 不匹配时阻止请求"}
            </span>
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            API Key
            {provider && <span className="text-xs text-muted-foreground ml-1.5">— {providerInfo?.name} ({providerInfo?.models})</span>}
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
              placeholder="sk-or-v1-... or sk-ant-... or sk-..."
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors font-mono"
            />
            <button onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          {providerInfo && (
            <div className="mt-2 space-y-2">
              <label className="text-[10px] text-muted-foreground">{en ? "Model" : "模型"}</label>
              <select value={aiModel} onChange={(e) => setAIModel(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                {availableCanonical.map((c) => {
                  const meta = CANONICAL_MODELS.find(m => m.id === c);
                  return <option key={c} value={c}>{defaultCanonical === c ? "⭐ " : ""}{meta?.label ?? c}</option>;
                })}
              </select>
              {provider !== "openrouter" && (
                <p className="text-[9px] text-muted-foreground/60">
                  {en
                    ? `Only ${providerInfo.name} models available. Use an sk-or-v1- OpenRouter key for multi-model access.`
                    : `仅 ${providerInfo.name} 模型可用。使用 sk-or-v1- OpenRouter 密钥以获取多模型访问。`}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button onClick={handleTestConnection} disabled={!hasKey || testing}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Zap className="w-4 h-4" strokeWidth={1.5} />}
            {testing ? (en ? "Testing..." : "测试中...") : !hasKey ? (en ? "Enter an API key to begin" : "输入 API Key 开始") : `${en ? "Test" : "测试"} ${providerInfo?.name} ${en ? "Connection" : "连接"}`}
          </button>

          {testResult === "success" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
              <Check className="w-4 h-4" strokeWidth={2} />
              {en ? "Connected — AI interpretation is ready" : "已连接 — AI 解读功能就绪"}
            </div>
          )}
          {testResult === "fail" && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p className="font-medium">{en ? "Connection failed" : "连接失败"}</p>
                <p className="text-xs text-amber-600/80 mt-0.5">
                  {en
                    ? "Check your API key at openrouter.ai/keys. Ensure it has available credits."
                    : "请在 openrouter.ai/keys 检查 API Key，确保有可用额度。"}
                </p>
              </div>
            </div>
          )}
        </div>

        {aiMode === "connected" && (
          <Link href="/analyze"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            {en ? "Go to Analysis Workspace" : "进入分析工作台"}
          </Link>
        )}
      </main>
    </div>
  );
}
