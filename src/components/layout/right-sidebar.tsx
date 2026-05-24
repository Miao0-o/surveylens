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
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

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
  const analysisStage = useAppStore((s) => s.analysisStage);
  const results = useAppStore((s) => s.results);
  const aiMode = useAppStore((s) => s.aiMode);
  const aiError = useAppStore((s) => s.aiError);
  const aiStreamingStage = useAppStore((s) => s.aiStreamingStage);

  const hasAI = aiMode === "connected";

  // ---- No AI mode: show upgrade card ----
  if (!hasAI && pipelineState !== "ai_processing") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-2">
        <Sparkles className="w-12 h-12 text-muted-foreground/30" strokeWidth={1} />
        <div>
          <p className="text-sm font-medium text-foreground mb-1">升级到 AI 增强</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            解锁统计指标自动解读、低信度题项诊断、APA 论文结果生成
          </p>
        </div>
        <Link
          href="/settings/ai"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          启用 AI 解读
          <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
        </Link>
      </div>
    );
  }

  // ---- AI mode: stats processing or idle ----
  if (pipelineState === "idle" || pipelineState === "processing") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3">
        <Sparkles className="w-10 h-10 text-muted-foreground/40" strokeWidth={1} />
        <p className="text-sm text-foreground font-medium">AI 已就绪</p>
        <p className="text-xs text-muted-foreground">
          {pipelineState === "processing"
            ? "分析完成后将自动生成解读"
            : "上传数据并开始分析后，AI 将自动解读结果"}
        </p>
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

  // ---- AI results ----
  if (aiResults) {
    return (
      <div className="space-y-3.5 overflow-y-auto h-full">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
          AI 解读
        </h3>

        {/* Simple explanation */}
        <ResultCard title="结果解读" icon={<Zap className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />}>
          <p className="text-sm text-foreground leading-relaxed">{aiResults.explanation.simple}</p>
        </ResultCard>

        {/* Academic version */}
        <ResultCard title="学术解释" icon={<Info className="w-3.5 h-3.5 text-blue-400" strokeWidth={1.5} />}>
          <p className="text-sm text-muted-foreground leading-relaxed">{aiResults.explanation.academic}</p>
        </ResultCard>

        {/* Suggestions */}
        {aiResults.suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
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

        {/* Diagnosis */}
        {(aiResults.diagnosis.lowReliabilityItems.length > 0 ||
          aiResults.diagnosis.crossLoadingItems.length > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">问题诊断</p>
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

        {/* APA Result */}
        {aiResults.apaResult && (
          <ResultCard title="APA 格式结果" icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />} action={<CopyButton text={aiResults.apaResult} />}>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{aiResults.apaResult}</pre>
          </ResultCard>
        )}
      </div>
    );
  }

  // ---- Stats done, AI should auto-trigger but not yet started ----
  if (pipelineState === "completed" && hasAI && !aiResults) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3">
        <Sparkles className="w-10 h-10 text-primary/40" strokeWidth={1} />
        <p className="text-sm text-muted-foreground">AI 正在准备解读...</p>
      </div>
    );
  }

  // ---- Error ----
  if (pipelineState === "error" || aiError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3">
        <AlertTriangle className="w-10 h-10 text-amber-400" strokeWidth={1} />
        <p className="text-sm text-foreground font-medium">AI 解读暂不可用</p>
        <p className="text-xs text-muted-foreground">{aiError ?? "分析过程中出现错误"}</p>
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
