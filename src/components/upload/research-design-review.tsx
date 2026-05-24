"use client";

import { useAppStore } from "@/lib/store";
import type { ResearchDesign, ComputedVariable, ComputeMethod } from "@/types";
import { normalizeDesign } from "@/lib/ai/design-normalizer";
import { Check, Edit3, X, Sparkles, AlertTriangle, Lock, LockOpen, Play, Calculator } from "lucide-react";
import { useState, useMemo } from "react";

/**
 * Shows the AI-normalized research design with inline editing.
 * Appears after user completes the guided setup.
 */
export function ResearchDesignReview() {
  const design = useAppStore((s) => s.researchDesign);
  const setDesign = useAppStore((s) => s.setResearchDesign);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Run normalizer on mount and when design changes
  const normalized = useMemo(() => {
    if (!design) return null;
    return normalizeDesign(design);
  }, [design]);

  const handleApplyNormalized = () => {
    if (!normalized || !design) return;
    setDesign({
      ...design,
      analysisIntent: normalized.analysisIntent,
      theoreticalFramework: normalized.theoreticalFramework,
      hypotheses: normalized.hypotheses.join("；"),
    });
  };

  if (!design || !normalized) return null;

  const intentLabels: Record<string, string> = {
    prediction: "预测建模",
    explanation: "解释性研究",
    validation: "量表验证",
    exploration: "探索性分析",
  };

  const fields: { key: keyof ResearchDesign; label: string; value: string }[] = [
    { key: "analysisIntent", label: "分析意图", value: intentLabels[design.analysisIntent] ?? design.analysisIntent },
    { key: "predictorVariables", label: "预测变量", value: design.predictorVariables.join(", ") || "未指定" },
    { key: "theoreticalFramework", label: "理论框架", value: design.theoreticalFramework || "未指定" },
    { key: "hypotheses", label: "研究假设", value: design.hypotheses || "未指定" },
  ];

  const startEdit = (field: string, current: string) => {
    setEditingField(field);
    setEditValue(current === "未指定" ? "" : current);
  };

  const saveEdit = () => {
    if (!editingField) return;
    const key = editingField as keyof ResearchDesign;

    if (key === "outcomeVariables" || key === "predictorVariables") {
      setDesign({ ...design, [key]: editValue.split(",").map((s) => s.trim()).filter(Boolean) });
    } else {
      setDesign({ ...design, [key]: editValue });
    }
    setEditingField(null);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">研究设计确认</span>
        {normalized.inferredFields.length > 0 ? (
          <span className="text-[10px] text-amber-600 flex items-center gap-1">
            <Sparkles className="w-3 h-3" strokeWidth={1.5} />
            部分字段已推断
          </span>
        ) : (
          <span className="text-[10px] text-emerald-600 flex items-center gap-1">
            <Check className="w-3 h-3" strokeWidth={2} />
            已结构化
          </span>
        )}
      </div>

      {/* Normalizer confidence warning */}
      {normalized.confidence !== "high" && (
        <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded bg-amber-50 border border-amber-100">
          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-[10px] font-medium text-amber-600">
              置信度：{normalized.confidence === "medium" ? "中等" : "较低"}
            </p>
            <p className="text-[9px] text-amber-500/80">
              以下字段由系统推断，请确认准确性
              {normalized.inferredFields.length > 0 && (
                <>：{normalized.inferredFields.join(", ")}</>
              )}
            </p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        以下是将用于指导分析的参数。点击 <Edit3 className="w-2.5 h-2.5 inline" strokeWidth={1.5} /> 可修改。
      </p>

      {/* Computed Outcomes — special display with method + sources */}
      <OutcomesDisplay design={design} setDesign={setDesign} />

      {fields.map(({ key, label, value }) => (
        <div key={key} className="group px-2.5 py-1.5 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <button
              onClick={() => startEdit(key, value)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
            >
              <Edit3 className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </div>

          {editingField === key ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 rounded border border-border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveEdit()}
              />
              <button onClick={saveEdit} className="text-emerald-500">
                <Check className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <button onClick={() => setEditingField(null)} className="text-muted-foreground">
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <p className={`text-xs ${value === "未指定" ? "text-muted-foreground/40 italic" : "text-foreground"}`}>
              {value}
            </p>
          )}
        </div>
      ))}

      {design.freeNotes && (
        <div className="px-2.5 py-1.5 rounded-lg bg-blue-50/30 border border-blue-100/30">
          <span className="text-[10px] text-blue-500">补充说明</span>
          <p className="text-xs text-blue-600/80">{design.freeNotes}</p>
        </div>
      )}

      {/* Schema Lock — must confirm before analysis */}
      <SchemaLockControl />
    </div>
  );
}

function SchemaLockControl() {
  const confirmed = useAppStore((s) => s.designConfirmed);
  const setConfirmed = useAppStore((s) => s.setDesignConfirmed);
  const design = useAppStore((s) => s.researchDesign);

  if (confirmed) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
        <Lock className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
        <div className="flex-1">
          <p className="text-xs font-medium text-emerald-700">研究设计已确认</p>
          <p className="text-[10px] text-emerald-600/80">分析将基于以上参数执行</p>
        </div>
        <button
          onClick={() => setConfirmed(false)}
          className="text-[10px] text-emerald-600 hover:underline shrink-0"
        >
          修改
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100">
      <div className="flex items-center gap-2">
        <LockOpen className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
        <p className="text-xs font-medium text-amber-700">设计尚未确认</p>
      </div>
      <p className="text-[10px] text-amber-600/80">
        请检查以上研究参数是否正确。确认后将锁定设计，点击下方按钮开始分析。
      </p>
      <button
        onClick={() => setConfirmed(true)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 border border-amber-200 text-xs font-medium text-amber-800
          hover:bg-amber-200 transition-colors"
      >
        <Check className="w-3.5 h-3.5" strokeWidth={2} />
        确认设计
      </button>
    </div>
  );
}

function OutcomesDisplay({
  design,
  setDesign,
}: {
  design: ResearchDesign;
  setDesign: (d: ResearchDesign) => void;
}) {
  const rawVars = design.outcomeVariables.filter((v) => !v.includes("(均值") && !v.includes("(总分") && !v.includes("(加权") && !v.includes("(因子"));

  const computedVars = parseComputed(design.outcomeVariables);
  const methodLabels: Record<string, string> = {
    mean: "均值", sum: "总分", weighted_mean: "加权均值", factor_score: "因子得分",
  };

  if (computedVars.length === 0 && rawVars.length === 0) {
    return (
      <div className="px-2.5 py-1.5 rounded-lg bg-secondary/30 border border-border/50">
        <span className="text-[10px] text-muted-foreground">结果变量</span>
        <p className="text-xs text-muted-foreground/40 italic">未指定</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-[10px] font-medium text-muted-foreground">结果变量</span>
      {computedVars.map((cv, i) => (
        <div key={i} className="px-2.5 py-2 rounded-lg bg-secondary/30 border border-border/50 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Calculator className="w-3 h-3 text-primary" strokeWidth={1.5} />
            <span className="text-xs font-medium text-foreground">{cv.name}</span>
            <span className="text-[9px] text-primary bg-primary/10 px-1 py-0.5 rounded">计算</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">方式：</span>
            <select
              value={cv.method}
              onChange={(e) => {
                const updated = [...computedVars];
                updated[i] = { ...cv, method: e.target.value as ComputeMethod };
                setDesign({ ...design, outcomeVariables: flattenComputed(updated, rawVars) });
              }}
              className="text-[10px] rounded border border-border px-1.5 py-0.5 bg-card focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {Object.entries(methodLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">来源：</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {cv.sourceItems.map((item) => (
                <span key={item} className="inline-flex items-center gap-0.5 text-[9px] bg-secondary/50 px-1.5 py-0.5 rounded">
                  {item}
                  <button
                    onClick={() => {
                      const updated = [...computedVars];
                      updated[i] = { ...cv, sourceItems: cv.sourceItems.filter((s) => s !== item) };
                      setDesign({ ...design, outcomeVariables: flattenComputed(updated, rawVars) });
                    }}
                    className="text-muted-foreground hover:text-red-500"
                  ><X className="w-2.5 h-2.5" strokeWidth={1.5} /></button>
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
      {rawVars.map((v, i) => (
        <div key={`raw-${i}`} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/30 border border-border/50">
          <Check className="w-3 h-3 text-muted-foreground shrink-0" strokeWidth={1.5} />
          <span className="text-xs text-foreground truncate flex-1">{v}</span>
          <button
            onClick={() => {
              const newRaw = rawVars.filter((_, j) => j !== i);
              setDesign({ ...design, outcomeVariables: flattenComputed(computedVars, newRaw) });
            }}
            className="text-muted-foreground hover:text-red-500"
          ><X className="w-3 h-3" strokeWidth={1.5} /></button>
        </div>
      ))}
    </div>
  );
}

function parseComputed(vars: string[]): ComputedVariable[] {
  const result: ComputedVariable[] = [];
  for (const v of vars) {
    const match = v.match(/^(.+?)\s*\((.+?)\s+of\s+(.+)\)$/);
    if (match) {
      const [, name, methodStr, itemsStr] = match;
      const methodMap: Record<string, ComputeMethod> = { "均值": "mean", "mean": "mean", "总分": "sum", "sum": "sum", "加权均值": "weighted_mean", "weighted_mean": "weighted_mean", "因子得分": "factor_score", "factor_score": "factor_score" };
      result.push({ name: name.trim(), method: methodMap[methodStr.trim()] ?? "mean", sourceItems: itemsStr.split(",").map((s) => s.trim()) });
    }
  }
  return result;
}

function flattenComputed(computed: ComputedVariable[], raw: string[]): string[] {
  const ml: Record<string, string> = { mean: "均值", sum: "总分", weighted_mean: "加权均值", factor_score: "因子得分" };
  return [...computed.map((cv) => `${cv.name} (${ml[cv.method] ?? cv.method} of ${cv.sourceItems.join(", ")})`), ...raw];
}

