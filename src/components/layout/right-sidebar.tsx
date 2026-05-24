"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useAI } from "@/hooks/use-ai";
import {
  Sparkles,
  AlertTriangle,
  Info,
  Copy,
  CheckCircle2,
  Loader2,
  Zap,
  ChevronRight,
  FileText,
  Lightbulb,
} from "lucide-react";
import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? (
        <><CheckCircle2 className="w-3 h-3 text-emerald-400" strokeWidth={1.5} /> 已复制</>
      ) : (
        <><Copy className="w-3 h-3" strokeWidth={1.5} /> 复制</>
      )}
    </button>
  );
}

export function RightSidebar() {
  const aiResults = useAppStore((s) => s.aiResults);
  const pipelineState = useAppStore((s) => s.pipelineState);
  const results = useAppStore((s) => s.results);
  const aiMode = useAppStore((s) => s.aiMode);
  const aiError = useAppStore((s) => s.aiError);
  const aiStreamingStage = useAppStore((s) => s.aiStreamingStage);

  const { status: aiStatus, error: aiCallError, runAI } = useAI();

  const hasAI = aiMode === "connected";

  // ---- Stats not done yet ----
  if (pipelineState === "idle" || pipelineState === "processing") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium text-foreground">AI 解读</p>
        </div>
        <p className="text-xs text-muted-foreground">
          分析完成后，AI 可自动生成以下内容：
        </p>
        <div className="space-y-2">
          {[
            { Icon: Zap, label: "统计指标解释", desc: "α、KMO、Bartlett 等指标含义" },
            { Icon: FileText, label: "APA 论文格式", desc: "可直接复制到学术论文中" },
            { Icon: Lightbulb, label: "诊断与建议", desc: "识别问题题项，给出优化方案" },
          ].map(({ Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-secondary/20">
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        {!hasAI && (
          <Link
            href="/settings/ai"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium
              hover:opacity-90 transition-opacity mt-2"
          >
            <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            配置 API Key 启用 AI 解读
          </Link>
        )}
      </div>
    );
  }

  // ---- AI loading / streaming ----
  if (pipelineState === "ai_processing") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" strokeWidth={1.5} />
          <span className="text-sm font-medium text-foreground">AI 解读中</span>
        </div>
        <StreamingProgress stage={aiStreamingStage} />
      </div>
    );
  }

  // ---- Analysis done + has AI results ----
  if (aiResults) {
    return (
      <div className="space-y-3.5 overflow-y-auto h-full">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
          AI 解读
        </h3>

        <ResultCard title="通俗解释" icon={<Zap className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />}>
          <p className="text-sm text-foreground leading-relaxed">{aiResults.explanation.simple}</p>
        </ResultCard>

        <ResultCard title="学术解释" icon={<Info className="w-3.5 h-3.5 text-blue-400" strokeWidth={1.5} />}>
          <p className="text-sm text-muted-foreground leading-relaxed">{aiResults.explanation.academic}</p>
        </ResultCard>

        {aiResults.suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
              诊断与建议
            </p>
            {aiResults.suggestions.map((s, i) => (
              <div key={i} className="px-3 py-2.5 rounded-lg bg-secondary/30 border border-border/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    s.severity === "warning" ? "bg-amber-400" :
                    s.severity === "suggestion" ? "bg-blue-400" : "bg-emerald-400"
                  }`} />
                  <p className="text-xs font-medium text-foreground">{s.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed ml-3">{s.detail}</p>
              </div>
            ))}
          </div>
        )}

        {(aiResults.diagnosis.lowReliabilityItems.length > 0 ||
          aiResults.diagnosis.crossLoadingItems.length > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
              问题诊断
            </p>
            {aiResults.diagnosis.lowReliabilityItems.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-amber-50/50 border border-amber-100/50">
                <p className="text-xs font-medium text-amber-700">低信度题项</p>
                <p className="text-xs text-amber-600/80">{aiResults.diagnosis.lowReliabilityItems.join(", ")}</p>
              </div>
            )}
            {aiResults.diagnosis.crossLoadingItems.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-blue-50/50 border border-blue-100/50">
                <p className="text-xs font-medium text-blue-700">交叉载荷题项</p>
                <p className="text-xs text-blue-600/80">{aiResults.diagnosis.crossLoadingItems.join(", ")}</p>
              </div>
            )}
          </div>
        )}

        {aiResults.apaResult && (
          <ResultCard title="APA 格式" icon={<FileText className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />} action={<CopyButton text={aiResults.apaResult} />}>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{aiResults.apaResult}</pre>
          </ResultCard>
        )}
      </div>
    );
  }

  // ---- Analysis done, no AI results yet ----
  if (pipelineState === "completed" && results) {
    if (hasAI) {
      // AI is connected → show generation options
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">AI 已就绪</span>
          </div>

          <p className="text-sm font-medium text-foreground">AI 学术解读</p>
          <p className="text-xs text-muted-foreground">
            选择要生成的内容。AI 基于分析结果生成，原始数据不会上传。
          </p>

          <div className="space-y-2">
            <button
              onClick={() => runAI()}
              disabled={aiStatus === "loading"}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground
                hover:bg-secondary/50 disabled:opacity-50 transition-colors text-left"
            >
              <Zap className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-medium">生成完整解读</p>
                <p className="text-[10px] text-muted-foreground">通俗解释 + 学术解释 + 诊断 + APA</p>
              </div>
            </button>
          </div>

          {aiStatus === "loading" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
              生成中...
            </div>
          )}

          {aiCallError && (
            <p className="text-xs text-red-500">{aiCallError}</p>
          )}
        </div>
      );
    }

    // AI not connected → prompt to enable
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm font-medium text-foreground">AI 解读</p>
        </div>
        <p className="text-xs text-muted-foreground">
          配置 AI 后可生成以下内容：
        </p>
        <div className="space-y-2">
          {[
            { Icon: Zap, label: "统计指标解释", desc: "α、KMO、Bartlett 等指标含义" },
            { Icon: FileText, label: "APA 论文格式", desc: "可直接复制到学术论文中" },
            { Icon: Lightbulb, label: "诊断与建议", desc: "识别问题题项，给出优化方案" },
          ].map(({ Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-secondary/20">
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/settings/ai"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium
            hover:opacity-90 transition-opacity"
        >
          <Sparkles className="w-4 h-4" strokeWidth={1.5} />
          配置 API Key 启用 AI 解读
        </Link>
      </div>
    );
  }

  // ---- Error ----
  if (pipelineState === "error" || aiError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3">
        <AlertTriangle className="w-10 h-10 text-amber-400" strokeWidth={1} />
        <p className="text-sm text-foreground font-medium">分析未完成</p>
        <p className="text-xs text-muted-foreground">请重试后查看 AI 解读</p>
      </div>
    );
  }

  return null;
}

function StreamingProgress({ stage }: { stage: string }) {
  const steps = [
    { key: "interpreting_reliability", label: "分析信度结果" },
    { key: "interpreting_validity", label: "解读效度指标" },
    { key: "diagnosing", label: "生成诊断建议" },
    { key: "generating_apa", label: "生成 APA 结果" },
  ];

  const stageIdx = steps.findIndex((s) => s.key === stage);

  return (
    <div className="space-y-1.5">
      {steps.map((step, i) => {
        const done = i < stageIdx || stage === "done";
        const active = i === stageIdx && stage !== "done";
        return (
          <div key={step.key} className="flex items-center gap-2 text-xs">
            {done ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} />
            ) : active ? (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" strokeWidth={1.5} />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-border" />
            )}
            <span className={done ? "text-emerald-600" : active ? "text-foreground font-medium" : "text-muted-foreground/40"}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ResultCard({ title, icon, children, action }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-secondary/30 border border-border/60 p-3.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">{icon}{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}
