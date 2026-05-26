"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useAI } from "@/hooks/use-ai";
import { LanguageToggle } from "./language-toggle";
import { MethodAdvisor } from "@/components/analysis/method-advisor";
import {
  Sparkles, AlertTriangle, Info, Copy, CheckCircle2, Loader2, Zap, FileText, Lightbulb, Shield,
} from "lucide-react";
import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
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
        <><CheckCircle2 className="w-3 h-3 text-emerald-400" strokeWidth={1.5} /> {en ? "Copied" : "已复制"}</>
      ) : (
        <><Copy className="w-3 h-3" strokeWidth={1.5} /> {en ? "Copy" : "复制"}</>
      )}
    </button>
  );
}

export function RightSidebar() {
  const aiResults = useAppStore((s) => s.aiResults);
  const pipelineState = useAppStore((s) => s.pipelineState);
  const results = useAppStore((s) => s.results);
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const researchDesign = useAppStore((s) => s.researchDesign);
  const codebook = useAppStore((s) => s.codebook);
  const hasDesign = !!(researchDesign?.researchGoal || (researchDesign?.outcomeVariables?.length ?? 0) > 0);
  const hasCodebook = !!(codebook && Object.keys(codebook.questions).length > 0);
  const aiMode = useAppStore((s) => s.aiMode);
  const aiError = useAppStore((s) => s.aiError);
  const aiStreamingStage = useAppStore((s) => s.aiStreamingStage);

  const { status: aiStatus, error: aiCallError, runAI } = useAI();
  const hasAI = aiMode === "connected";

  const featureCards = [
    { Icon: Shield, labelEn: "Data Quality Diagnostics", labelZh: "数据质量诊断", descEn: "Missing rate, distribution, reverse-item detection", descZh: "缺失率、分布、反向题风险检测" },
    { Icon: Lightbulb, labelEn: "Issue Location & Repair", labelZh: "问题定位与修复", descEn: "Data / Scale / Analysis level suggestions", descZh: "数据层 / 量表层 / 分析层三级建议" },
    { Icon: FileText, labelEn: "APA Academic Report", labelZh: "APA 学术报告", descEn: "Publication-ready results, one-click copy", descZh: "论文级结果段落，一键复制" },
  ];

  // ---- Stats not done yet ----
  if (pipelineState === "idle" || pipelineState === "processing") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm font-medium text-foreground">{en ? "AI Interpretation" : "AI 解读"}</p>
          </div>
          <LanguageToggle />
        </div>
        <p className="text-xs text-muted-foreground">
          {en ? "After analysis, AI can generate:" : "分析完成后，AI 可自动生成以下内容："}
        </p>
        <div className="space-y-2">
          {featureCards.map(({ Icon, labelEn, labelZh, descEn, descZh }) => (
            <div key={labelEn} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-secondary/20">
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-medium text-foreground">{en ? labelEn : labelZh}</p>
                <p className="text-[11px] text-muted-foreground">{en ? descEn : descZh}</p>
              </div>
            </div>
          ))}
        </div>
        {!hasAI && (
          <Link href="/settings/ai"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity mt-2">
            <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            {en ? "Configure API Key" : "配置 API Key 启用 AI 解读"}
          </Link>
        )}
      </div>
    );
  }

  // ---- AI loading ----
  if (pipelineState === "ai_processing") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" strokeWidth={1.5} />
          <span className="text-sm font-medium text-foreground">{en ? "AI Interpreting..." : "AI 解读中"}</span>
        </div>
        <StreamingProgress stage={aiStreamingStage} lang={lang} />
      </div>
    );
  }

  // ---- Has AI results ----
  if (aiResults) {
    return (
      <div className="space-y-3.5 overflow-y-auto h-full">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
          {en ? "AI Interpretation" : "AI 解读"}
        </h3>

        {aiResults.interpretationConfidence && (
          <div className={`px-3 py-1.5 rounded-lg border text-[10px] ${
            aiResults.interpretationConfidence === "high" ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
            aiResults.interpretationConfidence === "moderate" ? "bg-amber-50 border-amber-100 text-amber-700" :
            "bg-red-50 border-red-100 text-red-600"
          }`}>
            {aiResults.interpretationConfidence === "high"
              ? (en ? "✓ Sufficient evidence — interpretation well-supported" : "✓ 统计证据较充分，解读可信度较高")
              : aiResults.interpretationConfidence === "moderate"
                ? (en ? "△ Partial support — interpret with caution" : "△ 统计证据部分支持，解读宜保持谨慎")
                : (en ? "⚠ Limited evidence — treat as tentative" : "⚠ 统计证据有限，解读结论宜视为初步参考")}
          </div>
        )}

        <ResultCard title={en ? "Simple Explanation" : "通俗解释"} icon={<Zap className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />}>
          <p className="text-sm text-foreground leading-relaxed">{aiResults.explanation.simple}</p>
        </ResultCard>

        <ResultCard title={en ? "Academic Interpretation" : "学术解释"} icon={<Info className="w-3.5 h-3.5 text-blue-400" strokeWidth={1.5} />}>
          <p className="text-sm text-muted-foreground leading-relaxed">{aiResults.explanation.academic}</p>
        </ResultCard>

        {aiResults.suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
              {en ? "Diagnosis & Suggestions" : "诊断与建议"}
            </p>
            {aiResults.suggestions.map((s, i) => {
              const parts = s.detail.split("\n\n证据: ");
              const mainText = parts[0] ?? s.detail;
              const evidence = parts.length > 1 ? parts[1] : "";
              return (
              <div key={i} className="px-3 py-2.5 rounded-lg bg-secondary/30 border border-border/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    s.severity === "warning" ? "bg-amber-400" : s.severity === "suggestion" ? "bg-blue-400" : "bg-emerald-400"
                  }`} />
                  <p className="text-xs font-medium text-foreground">{s.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed ml-3">{mainText}</p>
                {evidence && (
                  <details className="mt-1 ml-3">
                    <summary className="text-[9px] text-muted-foreground/60 cursor-pointer hover:text-muted-foreground">
                      {en ? "View statistical evidence" : "查看统计证据"}
                    </summary>
                    <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-relaxed">{evidence}</p>
                  </details>
                )}
              </div>
            )})}
          </div>
        )}

        {(aiResults.diagnosis.lowReliabilityItems.length > 0 || aiResults.diagnosis.crossLoadingItems.length > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
              {en ? "Issue Diagnosis" : "问题诊断"}
            </p>
            {aiResults.diagnosis.lowReliabilityItems.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-amber-50/50 border border-amber-100/50">
                <p className="text-xs font-medium text-amber-700">{en ? "Low Reliability Items" : "低信度题项"}</p>
                <p className="text-xs text-amber-600/80">{aiResults.diagnosis.lowReliabilityItems.join(", ")}</p>
              </div>
            )}
            {aiResults.diagnosis.crossLoadingItems.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-blue-50/50 border border-blue-100/50">
                <p className="text-xs font-medium text-blue-700">{en ? "Cross-Loading Items" : "交叉载荷题项"}</p>
                <p className="text-xs text-blue-600/80">{aiResults.diagnosis.crossLoadingItems.join(", ")}</p>
              </div>
            )}
          </div>
        )}

        {aiResults.shortAPA && (
          <div className="px-3 py-2.5 rounded-lg bg-emerald-50/30 border border-emerald-100/50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-emerald-700">{en ? "APA Summary" : "APA 摘要"}</p>
              <CopyButton text={aiResults.shortAPA} />
            </div>
            <p className="text-xs text-emerald-600/80 leading-relaxed">{aiResults.shortAPA}</p>
          </div>
        )}
        {aiResults.apaResult && (
          <ResultCard title={en ? "APA Full Format" : "APA 完整格式"} icon={<FileText className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />} action={<CopyButton text={aiResults.apaResult} />}>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{aiResults.apaResult}</pre>
          </ResultCard>
        )}
      </div>
    );
  }

  // ---- Completed, no AI results yet ----
  if (pipelineState === "completed" && results) {
    if (hasAI) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">{en ? "AI Ready" : "AI 已就绪"}</span>
            </div>
            <LanguageToggle />
          </div>
          <MethodAdvisor />
          <hr className="border-border" />
          <p className="text-sm font-medium text-foreground">{en ? "AI Academic Interpretation" : "AI 学术解读"}</p>
          <p className="text-xs text-muted-foreground">
            {en ? "Select content to generate. AI interprets diagnostic results — raw data is never uploaded." : "选择要生成的内容。AI 基于诊断结果生成，原始数据不会上传。"}
          </p>
          {(!hasDesign || !hasCodebook) && (
            <div className="text-[10px] text-blue-600/80 bg-blue-50/40 border border-blue-100/50 rounded-lg px-3 py-2 space-y-1">
              <p className="font-medium">{en ? "Tip: Improve interpretation accuracy" : "提示：提升 AI 解读准确性"}</p>
              <ul className="space-y-0.5 text-blue-600/70">
                {!hasDesign && (
                  <li>{en ? "Set research goal & variables in Custom mode → research design" : "在自定义模式中设置研究目标与变量，AI 可提供假设导向解读"}</li>
                )}
                {!hasCodebook && (
                  <li>{en ? "Upload a codebook to map text labels → numeric values" : "上传编码簿将文本标签映射为数值，避免数据被误判为无效"}</li>
                )}
              </ul>
            </div>
          )}
          <div className="space-y-2">
            <button onClick={() => runAI()} disabled={aiStatus === "loading"}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-secondary/50 disabled:opacity-50 transition-colors text-left">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-medium">{en ? "Generate Full Interpretation" : "生成完整解读"}</p>
                <p className="text-[10px] text-muted-foreground">{en ? "Simple + Academic + Diagnostics + APA" : "通俗解释 + 学术解释 + 诊断 + APA"}</p>
              </div>
            </button>
          </div>
          {aiStatus === "loading" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
              {en ? "Generating..." : "生成中..."}
            </div>
          )}
          <p className="text-[9px] text-muted-foreground/50 text-center mt-2">
            {en ? "AI interpretation uses your own API key and may incur a small cost (~$0.01–0.05 per request)." : "AI 解读使用您自己的 API Key，可能产生少量费用（每次约 ¥0.05–0.30）。"}
          </p>
          {aiCallError && <p className="text-xs text-red-500">{aiCallError}</p>}
        </div>
      );
    }
    // AI not connected
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm font-medium text-foreground">{en ? "AI Interpretation" : "AI 解读"}</p>
          </div>
          <LanguageToggle />
        </div>
        <p className="text-xs text-muted-foreground">{en ? "After configuring AI, you can generate:" : "配置 AI 后可生成以下内容："}</p>
        <div className="space-y-2">
          {featureCards.map(({ Icon, labelEn, labelZh, descEn, descZh }) => (
            <div key={labelEn} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-secondary/20">
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-medium text-foreground">{en ? labelEn : labelZh}</p>
                <p className="text-[11px] text-muted-foreground">{en ? descEn : descZh}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/settings/ai"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Sparkles className="w-4 h-4" strokeWidth={1.5} />
          {en ? "Configure API Key" : "配置 API Key 启用 AI 解读"}
        </Link>
      </div>
    );
  }

  // ---- Error ----
  if (pipelineState === "error" || aiError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3">
        <AlertTriangle className="w-10 h-10 text-amber-400" strokeWidth={1} />
        <p className="text-sm text-foreground font-medium">{en ? "Analysis Incomplete" : "分析未完成"}</p>
        <p className="text-xs text-muted-foreground">{en ? "Please retry to view AI interpretation" : "请重试后查看 AI 解读"}</p>
      </div>
    );
  }

  return null;
}

function StreamingProgress({ stage, lang }: { stage: string; lang: string }) {
  const en = lang === "en";
  const steps = [
    { key: "interpreting_reliability", labelEn: "Analyzing reliability", labelZh: "分析信度结果" },
    { key: "interpreting_validity", labelEn: "Interpreting validity", labelZh: "解读效度指标" },
    { key: "diagnosing", labelEn: "Generating diagnostics", labelZh: "生成诊断建议" },
    { key: "generating_apa", labelEn: "Generating APA results", labelZh: "生成 APA 结果" },
  ];
  const stageIdx = steps.findIndex((s) => s.key === stage);

  return (
    <div className="space-y-1.5">
      {steps.map((step, i) => {
        const done = i < stageIdx || stage === "done";
        const active = i === stageIdx && stage !== "done";
        return (
          <div key={step.key} className="flex items-center gap-2 text-xs">
            {done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} /> :
             active ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" strokeWidth={1.5} /> :
             <div className="w-3.5 h-3.5 rounded-full border border-border" />}
            <span className={done ? "text-emerald-600" : active ? "text-foreground font-medium" : "text-muted-foreground/40"}>
              {en ? step.labelEn : step.labelZh}
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
