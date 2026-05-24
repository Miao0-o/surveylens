"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type { AnalysisIntent, ResearchDesign } from "@/types";
import { ChevronRight, ChevronLeft, Check, Target, Users, Lightbulb, FileText, MessageSquare, Calculator, Layers, Plus, X } from "lucide-react";

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

      {/* Step 2: Construct Variables */}
      {step === 2 && (
        <ConstructStep
          design={design}
          rawData={rawData}
          update={update}
          step={2}
        />
      )}

      {/* Step 3: Predictors */}
      {step === 3 && (
        <ConstructStep
          design={design}
          rawData={rawData}
          update={update}
          step={3}
        />
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

type CompositeMode = "single" | "mean" | "sum";

function ConstructStep({
  design,
  rawData,
  update,
  step,
}: {
  design: ResearchDesign | null;
  rawData: { headers: string[] } | null;
  update: (patch: Partial<ResearchDesign>) => void;
  step: 2 | 3;
}) {
  const isOutcome = step === 2;
  const label = isOutcome ? "结果变量" : "预测变量";
  const desc = isOutcome
    ? "结果变量通常是量表的维度分或总分，由多个题项计算得出"
    : "预测变量是可能影响结果的自变量或协变量";
  const selected = isOutcome ? (design?.outcomeVariables ?? []) : (design?.predictorVariables ?? []);
  const setSelected = (vars: string[]) => {
    if (isOutcome) update({ outcomeVariables: vars });
    else update({ predictorVariables: vars });
  };

  const likertCols = useMemo(
    () => (rawData?.headers ?? []).filter((c) => !isOutcome || !(design?.predictorVariables ?? []).includes(c)),
    [rawData, design?.predictorVariables, isOutcome]
  );

  // Current composite group name
  const [compositeName, setCompositeName] = useState("");
  const [compositeMode, setCompositeMode] = useState<CompositeMode>("mean");
  const [compositeItems, setCompositeItems] = useState<string[]>([]);

  const addComposite = () => {
    if (!compositeName.trim() || compositeItems.length < 2) return;
    const compositeLabel = `${compositeName.trim()} (${compositeMode === "mean" ? "均值" : "总分"} of ${compositeItems.join(", ")})`;
    setSelected([...selected, compositeLabel]);
    setCompositeName("");
    setCompositeItems([]);
  };

  const toggleItem = (col: string) => {
    if (selected.includes(col)) {
      setSelected(selected.filter((c) => c !== col));
    } else {
      setSelected([...selected, col]);
    }
  };

  const toggleCompositeItem = (col: string) => {
    setCompositeItems((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        {isOutcome ? (
          <Target className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
        ) : (
          <Users className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        )}
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className={`text-[10px] ${isOutcome ? "text-red-400" : "text-muted-foreground"}`}>
          {isOutcome ? "必填" : "选填"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>

      {/* Already selected items */}
      {selected.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">已选择：</span>
          {selected.map((v) => (
            <div key={v} className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-primary/5 border border-primary/10 text-xs text-primary font-medium">
              <Check className="w-3 h-3 shrink-0" strokeWidth={2} />
              <span className="flex-1 truncate">{v}</span>
              <button onClick={() => setSelected(selected.filter((c) => c !== v))} className="text-muted-foreground hover:text-red-500">
                <X className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Build composite score */}
      <div className="space-y-2 px-3 py-2.5 rounded-lg bg-secondary/30 border border-border/50">
        <div className="flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
          <span className="text-xs font-medium text-foreground">构建分量表</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          将多个题项合并为一个变量（如维度均值）
        </p>

        {/* Mode selector */}
        <div className="flex gap-1">
          {(["mean", "sum"] as CompositeMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setCompositeMode(mode)}
              className={`px-2.5 py-1 rounded text-[10px] ${
                compositeMode === mode ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              {mode === "mean" ? "均值" : "总分"}
            </button>
          ))}
        </div>

        {/* Name input */}
        <input
          type="text"
          value={compositeName}
          onChange={(e) => setCompositeName(e.target.value)}
          placeholder="变量名，如：焦虑维度"
          className="w-full rounded border border-border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />

        {/* Item selection for composite */}
        <div className="max-h-[100px] overflow-y-auto space-y-0.5">
          {likertCols.map((col) => {
            const inComposite = compositeItems.includes(col);
            return (
              <button
                key={col}
                onClick={() => toggleCompositeItem(col)}
                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${
                  inComposite ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <div className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${
                  inComposite ? "bg-primary border-primary" : "border-muted-foreground/30"
                }`}>
                  {inComposite && <Check className="w-2 h-2 text-white" strokeWidth={2.5} />}
                </div>
                {col}
              </button>
            );
          })}
        </div>

        <button
          onClick={addComposite}
          disabled={!compositeName.trim() || compositeItems.length < 2}
          className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-primary/10 text-primary text-xs font-medium
            hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-3 h-3" strokeWidth={1.5} />
          添加分量表
        </button>
      </div>

      {/* Direct item selection */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Layers className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
          <span className="text-[10px] text-muted-foreground">或直接选择题项</span>
        </div>
        <div className="max-h-[100px] overflow-y-auto space-y-0.5">
          {likertCols.slice(0, 20).map((col) => (
            <button
              key={col}
              onClick={() => toggleItem(col)}
              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${
                selected.includes(col) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              <div className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${
                selected.includes(col) ? "bg-primary border-primary" : "border-muted-foreground/30"
              }`}>
                {selected.includes(col) && <Check className="w-2 h-2 text-white" strokeWidth={2.5} />}
              </div>
              {col}
            </button>
          ))}
        </div>
      </div>

      {isOutcome && selected.length === 0 && (
        <p className="text-[10px] text-amber-500">至少选择一个结果变量</p>
      )}
    </div>
  );
}

function defaultDesign(): ResearchDesign {
  return {
    researchGoal: "",
    analysisIntent: "validation",
    outcomes: [],
    outcomeVariables: [],
    predictorVariables: [],
    theoreticalFramework: "",
    hypotheses: "",
    freeNotes: "",
  };
}
