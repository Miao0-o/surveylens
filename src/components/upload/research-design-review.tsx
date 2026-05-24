"use client";

import { useAppStore } from "@/lib/store";
import type { ResearchDesign } from "@/types";
import { normalizeDesign } from "@/lib/ai/design-normalizer";
import { Check, Edit3, X, Sparkles, AlertTriangle, Lock, LockOpen, Play } from "lucide-react";
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
    { key: "outcomeVariables", label: "结果变量", value: design.outcomeVariables.join(", ") || "未指定" },
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
