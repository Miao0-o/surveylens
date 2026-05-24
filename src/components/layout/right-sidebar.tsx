"use client";

import { useAppStore } from "@/lib/store";
import { useAI } from "@/hooks/use-ai";
import { Sparkles, Key, Eye, Copy, CheckCircle2, AlertTriangle, Info, Loader2, Zap } from "lucide-react";
import { useState } from "react";

function APIKeyInput() {
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Key className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        <label className="text-sm font-medium text-foreground">Claude API Key</label>
      </div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-api-..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground placeholder:text-muted-foreground/40
            focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors font-mono"
        />
        <button
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
      <p className="text-xs text-muted-foreground/70">
        Key 仅保存在浏览器本地，经后端代理转发。
      </p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? (
        <>
          <CheckCircle2 className="w-3 h-3 text-emerald-400" strokeWidth={1.5} />
          已复制
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" strokeWidth={1.5} />
          复制
        </>
      )}
    </button>
  );
}

export function RightSidebar() {
  const aiResults = useAppStore((s) => s.aiResults);
  const pipelineState = useAppStore((s) => s.pipelineState);
  const apiKey = useAppStore((s) => s.apiKey);
  const { status: aiStatus, error: aiError, runAI } = useAI();

  const showAPIInput =
    pipelineState === "idle" ||
    pipelineState === "completed" ||
    pipelineState === "error";

  // ---- Empty / idle state ----
  if (pipelineState === "idle" || pipelineState === "processing") {
    return (
      <div className="flex flex-col h-full gap-5">
        {showAPIInput && <APIKeyInput />}
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Sparkles className="w-12 h-12" strokeWidth={1} />
          <p className="text-base text-center font-medium">AI 解读结果将在分析完成后显示</p>
          <p className="text-sm text-muted-foreground/60 text-center">
            通俗解读 · 学术解释 · 导师建议 · APA 格式
          </p>
        </div>
      </div>
    );
  }

  // ---- AI processing ----
  if (pipelineState === "ai_processing" || aiStatus === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">AI 正在解读结果...</p>
        <p className="text-xs text-muted-foreground/60">
          请稍候，通常需要 3-5 秒
        </p>
      </div>
    );
  }

  // ---- Has AI results ----
  if (aiResults) {
    return (
      <div className="space-y-3.5 overflow-y-auto h-full">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
          AI 解读结果
        </h3>

        {/* Simple explanation */}
        <ResultCard
          title="通俗解读"
          icon={<Zap className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />}
        >
          <p className="text-sm text-foreground leading-relaxed">
            {aiResults.explanation.simple}
          </p>
        </ResultCard>

        {/* Academic explanation */}
        <ResultCard
          title="学术解读"
          icon={<Info className="w-3.5 h-3.5 text-blue-400" strokeWidth={1.5} />}
        >
          <p className="text-sm text-muted-foreground leading-relaxed">
            {aiResults.explanation.academic}
          </p>
        </ResultCard>

        {/* Advisor suggestions */}
        {aiResults.suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
              导师建议
            </p>
            {aiResults.suggestions.map((s, i) => (
              <div
                key={i}
                className="px-3 py-2.5 rounded-lg bg-secondary/30 border border-border/60"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      s.severity === "warning"
                        ? "bg-amber-400"
                        : s.severity === "suggestion"
                          ? "bg-blue-400"
                          : "bg-emerald-400"
                    }`}
                  />
                  <p className="text-xs font-medium text-foreground">{s.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed ml-3">
                  {s.detail}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Problem diagnosis */}
        {(aiResults.diagnosis.lowReliabilityItems.length > 0 ||
          aiResults.diagnosis.crossLoadingItems.length > 0 ||
          aiResults.diagnosis.reverseItemRisks.length > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">问题诊断</p>
            {aiResults.diagnosis.lowReliabilityItems.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-amber-50/50 border border-amber-100/50">
                <p className="text-xs font-medium text-amber-700">低信度题项</p>
                <p className="text-xs text-amber-600/80">
                  {aiResults.diagnosis.lowReliabilityItems.join(", ")}
                </p>
              </div>
            )}
            {aiResults.diagnosis.crossLoadingItems.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-blue-50/50 border border-blue-100/50">
                <p className="text-xs font-medium text-blue-700">交叉载荷题项</p>
                <p className="text-xs text-blue-600/80">
                  {aiResults.diagnosis.crossLoadingItems.join(", ")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* APA Result */}
        {aiResults.apaResult && (
          <ResultCard
            title="APA 格式结果"
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />}
            action={<CopyButton text={aiResults.apaResult} />}
          >
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {aiResults.apaResult}
            </pre>
          </ResultCard>
        )}

        {showAPIInput && (
          <>
            <hr className="border-border" />
            <APIKeyInput />
          </>
        )}
      </div>
    );
  }

  // ---- Completed but no AI results ----
  if (pipelineState === "completed") {
    return (
      <div className="flex flex-col h-full gap-5">
        <APIKeyInput />

        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Sparkles className="w-12 h-12 text-muted-foreground" strokeWidth={1} />
          <p className="text-base text-foreground font-medium text-center">
            统计分析完成
          </p>
          <p className="text-sm text-muted-foreground text-center">
            {apiKey
              ? "点击下方按钮获取 AI 解读与建议"
              : "请先配置 Claude API Key"}
          </p>
          <button
            onClick={runAI}
            disabled={!apiKey || !apiKey.startsWith("sk-ant")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium
              hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            AI 解读结果
          </button>
          {aiError && (
            <p className="text-[10px] text-red-500 text-center">{aiError}</p>
          )}
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (pipelineState === "error") {
    return (
      <div className="flex flex-col h-full gap-5">
        {showAPIInput && <APIKeyInput />}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">
            分析出错，请重试后获取 AI 解读
          </p>
        </div>
      </div>
    );
  }

  return null;
}

/** Small reusable card wrapper */
function ResultCard({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-secondary/30 border border-border/60 p-3.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
          {icon}
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}
