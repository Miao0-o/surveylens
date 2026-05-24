"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import type { AnalysisIntent, ResearchDesign } from "@/types";
import { ChevronRight, ChevronLeft, Check, Target, Users, Lightbulb, FileText, MessageSquare } from "lucide-react";

const INTENT_OPTIONS: { value: AnalysisIntent; label: string; desc: string; icon: typeof Target }[] = [
  { value: "validation", label: "量表验证", desc: "检验问卷信度与效度，验证因子结构", icon: Check },
  { value: "exploration", label: "探索性分析", desc: "探索数据结构，发现潜在因子", icon: Lightbulb },
  { value: "explanation", label: "解释性研究", desc: "解释变量间的关系与影响路径", icon: Target },
  { value: "prediction", label: "预测建模", desc: "建立预测模型，筛选关键预测因子", icon: Users },
];

const FRAMEWORKS = [
  "无特定理论框架",
  "生物-心理-社会模型",
  "认知行为模型",
  "临床诊断模型",
  "发展心理学模型",
  "社会认知理论",
  "自我决定理论",
  "大五人格模型",
  "自定义",
];

type Step = 1 | 2 | 3 | 4 | 5;

export function GuidedResearchSetup() {
  const design = useAppStore((s) => s.researchDesign);
  const setDesign = useAppStore((s) => s.setResearchDesign);
  const rawData = useAppStore((s) => s.rawData);
  const [step, setStep] = useState<Step>(1);

  const update = (patch: Partial<ResearchDesign>) => {
    setDesign({ ...(design ?? defaultDesign()), ...patch });
  };

  const totalSteps = 5;

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {([1, 2, 3, 4, 5] as Step[]).map((s) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full transition-colors ${
              s <= step ? "bg-primary" : "bg-secondary"
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        第 {step} / {totalSteps} 步 · 可跳过非必填项
      </p>

      {/* Step 1: Analysis Intent */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">研究目标</span>
            <span className="text-[10px] text-red-400">必填</span>
          </div>
          <div className="grid gap-1.5">
            {INTENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = design?.analysisIntent === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => update({ analysisIntent: opt.value })}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    selected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-muted-foreground/20"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${selected ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                  <div>
                    <p className={`text-xs font-medium ${selected ? "text-primary" : "text-foreground"}`}>{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Outcome Variables */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">结果变量</span>
            <span className="text-[10px] text-red-400">必填</span>
          </div>
          <p className="text-xs text-muted-foreground">
            选择用于衡量研究结果的核心变量（如量表总分、特定题项）
          </p>
          <div className="max-h-[160px] overflow-y-auto space-y-1">
            {(rawData?.headers ?? []).map((col) => {
              const selected = design?.outcomeVariables.includes(col);
              return (
                <button
                  key={col}
                  onClick={() => {
                    const current = design?.outcomeVariables ?? [];
                    update({
                      outcomeVariables: selected
                        ? current.filter((c) => c !== col)
                        : [...current, col],
                    });
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors ${
                    selected ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    selected ? "bg-primary border-primary" : "border-muted-foreground/30"
                  }`}>
                    {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
                  </div>
                  {col}
                </button>
              );
            })}
          </div>
          {(!design?.outcomeVariables || design.outcomeVariables.length === 0) && (
            <p className="text-[10px] text-amber-500">至少选择一个结果变量</p>
          )}
        </div>
      )}

      {/* Step 3: Predictors */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">预测变量</span>
            <span className="text-[10px] text-muted-foreground">选填</span>
          </div>
          <p className="text-xs text-muted-foreground">选择可能影响结果变量的预测因子</p>
          <div className="max-h-[160px] overflow-y-auto space-y-1">
            {(rawData?.headers ?? [])
              .filter((c) => !(design?.outcomeVariables ?? []).includes(c))
              .map((col) => {
                const selected = design?.predictorVariables.includes(col);
                return (
                  <button
                    key={col}
                    onClick={() => {
                      const current = design?.predictorVariables ?? [];
                      update({
                        predictorVariables: selected
                          ? current.filter((c) => c !== col)
                          : [...current, col],
                      });
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors ${
                      selected ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      selected ? "bg-primary border-primary" : "border-muted-foreground/30"
                    }`}>
                      {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
                    </div>
                    {col}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Step 4: Theoretical Framework */}
      {step === 4 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">理论框架</span>
            <span className="text-[10px] text-muted-foreground">选填</span>
          </div>
          <div className="grid gap-1">
            {FRAMEWORKS.map((fw) => {
              const selected = design?.theoreticalFramework === fw;
              return (
                <button
                  key={fw}
                  onClick={() => update({ theoreticalFramework: fw === "自定义" ? "" : fw })}
                  className={`px-3 py-2 rounded-lg border text-xs text-left transition-colors ${
                    selected ? "border-primary/40 bg-primary/5 text-primary font-medium" : "border-border hover:border-muted-foreground/20 text-foreground"
                  }`}
                >
                  {fw}
                </button>
              );
            })}
          </div>
          {design?.theoreticalFramework === "" && (
            <input
              type="text"
              value={design?.theoreticalFramework ?? ""}
              onChange={(e) => update({ theoreticalFramework: e.target.value })}
              placeholder="输入自定义理论框架..."
              className="w-full rounded-lg border border-border px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
        </div>
      )}

      {/* Step 5: Free Notes */}
      {step === 5 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">补充说明</span>
            <span className="text-[10px] text-muted-foreground">选填</span>
          </div>
          <textarea
            value={design?.freeNotes ?? ""}
            onChange={(e) => update({ freeNotes: e.target.value })}
            placeholder="任何关于研究设计、假设或其他补充信息..."
            rows={3}
            className="w-full resize-none rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">研究假设（可选）</label>
            <textarea
              value={design?.hypotheses ?? ""}
              onChange={(e) => update({ hypotheses: e.target.value })}
              placeholder="例如：H1: 焦虑水平与抑郁水平呈正相关"
              rows={2}
              className="w-full resize-none rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setStep(Math.max(1, step - 1) as Step)}
          disabled={step === 1}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" strokeWidth={1.5} />
          上一步
        </button>

        {step < totalSteps ? (
          <button
            onClick={() => setStep((step + 1) as Step)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            下一步
            <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
          </button>
        ) : (
          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1 text-xs text-emerald-600"
          >
            <Check className="w-3 h-3" strokeWidth={2} />
            完成设置
          </button>
        )}
      </div>
    </div>
  );
}

function defaultDesign(): ResearchDesign {
  return {
    researchGoal: "",
    analysisIntent: "validation",
    outcomeVariables: [],
    predictorVariables: [],
    theoreticalFramework: "",
    hypotheses: "",
    freeNotes: "",
  };
}
