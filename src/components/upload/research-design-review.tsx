"use client";

import { useAppStore } from "@/lib/store";
import type { ResearchDesign } from "@/types";
import { Check, Edit3, X } from "lucide-react";
import { useState } from "react";

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

/**
 * Shows the AI-normalized research design with inline editing.
 * Appears after user completes the guided setup.
 */
export function ResearchDesignReview() {
  const design = useAppStore((s) => s.researchDesign);
  const setDesign = useAppStore((s) => s.setResearchDesign);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (!design) return null;

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
        <span className="text-[10px] text-emerald-600 flex items-center gap-1">
          <Check className="w-3 h-3" strokeWidth={2} />
          已结构化
        </span>
      </div>

      <p className="text-[10px] text-muted-foreground">
        以下是将用于指导分析的参数。点击任意字段可修改。
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
    </div>
  );
}
