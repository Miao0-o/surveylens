"use client";

import { useAppStore } from "@/lib/store";
import { Info } from "lucide-react";

export function ResearchInfo() {
  const researchGoal = useAppStore((s) => s.researchGoal);
  const theoreticalDimensions = useAppStore((s) => s.theoreticalDimensions);
  const setResearchGoal = useAppStore((s) => s.setResearchGoal);
  const setTheoreticalDimensions = useAppStore((s) => s.setTheoreticalDimensions);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-foreground">研究信息</label>
        <span className="text-[10px] text-muted-foreground">选填</span>
      </div>

      {/* Research goal */}
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">研究目标</label>
        <textarea
          value={researchGoal}
          onChange={(e) => setResearchGoal(e.target.value)}
          placeholder="例如：测量大学生焦虑水平"
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50
            focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors"
        />
      </div>

      {/* Theoretical dimensions */}
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">
          理论维度（用逗号分隔）
        </label>
        <input
          type="text"
          value={theoreticalDimensions}
          onChange={(e) => setTheoreticalDimensions(e.target.value)}
          placeholder="例如：焦虑, 抑郁, 压力"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50
            focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors"
        />
      </div>

      <div className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-blue-50/50 border border-blue-100/50">
        <Info className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" strokeWidth={1.5} />
        <p className="text-[10px] text-blue-600/80 leading-relaxed">
          填写研究目标和理论维度可帮助 AI 更准确地命名因子、解读结果并生成针对性的学术建议。
        </p>
      </div>
    </div>
  );
}
