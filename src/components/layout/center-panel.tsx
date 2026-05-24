"use client";

import { useAppStore } from "@/lib/store";
import { DataPreview } from "@/components/preprocessing/data-preview";
import { OverviewDashboard } from "@/components/analysis/overview-dashboard";
import { ReliabilityCard } from "@/components/analysis/reliability-card";
import { ValidityCard } from "@/components/analysis/validity-card";
import { CorrelationHeatmap } from "@/components/analysis/correlation-heatmap";
import { EFACard } from "@/components/analysis/efa-card";
import { FactorStructure } from "@/components/analysis/factor-structure";
import { StabilityCard } from "@/components/analysis/stability-card";
import { FileSpreadsheet, BarChart3 } from "lucide-react";
import { ExportBar } from "@/components/export/export-bar";
import { useState } from "react";

type ResultTab = "overview" | "reliability" | "validity" | "efa" | "stability";

const TABS: { id: ResultTab; label: string }[] = [
  { id: "overview", label: "概览" },
  { id: "reliability", label: "信度" },
  { id: "validity", label: "效度" },
  { id: "efa", label: "因子分析" },
  { id: "stability", label: "样本稳定性" },
];

export function CenterPanel() {
  const rawData = useAppStore((s) => s.rawData);
  const pipelineState = useAppStore((s) => s.pipelineState);
  const results = useAppStore((s) => s.results);
  const [activeTab, setActiveTab] = useState<ResultTab>("overview");

  // ---- Empty state ----
  if (!rawData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <FileSpreadsheet className="w-16 h-16" strokeWidth={1} />
        <p className="text-base font-medium">上传数据后将在此处显示数据预览与分析结果</p>
        <p className="text-sm text-muted-foreground/60">
          支持 .csv · .xlsx · .xls · Qualtrics 导出
        </p>
      </div>
    );
  }

  // ---- Idle: show data preview ----
  if (pipelineState === "idle") {
    return <DataPreview />;
  }

  // ---- Processing ----
  if (pipelineState === "processing" || pipelineState === "ai_processing") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <div>
          <p className="text-sm text-foreground font-medium text-center">统计分析中</p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {pipelineState === "ai_processing"
              ? "AI 正在解读分析结果..."
              : "正在执行本地统计计算..."}
          </p>
        </div>
      </div>
    );
  }

  // ---- Completed: show results ----
  if (pipelineState === "completed" && results) {
    return (
      <div id="report-content" className="space-y-5">
        {/* Tab navigation */}
        <div className="flex gap-1 p-0.5 rounded-lg bg-secondary/30 w-fit overflow-x-auto max-w-full">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap ${
                activeTab === id
                  ? "bg-card text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-5">
          {activeTab === "overview" && <OverviewDashboard results={results} />}

          {activeTab === "reliability" && (
            <div className="p-5 rounded-xl bg-card border border-border">
              <ReliabilityCard data={results.reliability} />
            </div>
          )}

          {activeTab === "validity" && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-card border border-border">
                <ValidityCard data={results.validity} />
              </div>
              <div className="p-5 rounded-xl bg-card border border-border">
                <CorrelationHeatmap data={results.validity} />
              </div>
            </div>
          )}

          {activeTab === "efa" && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-card border border-border">
                <EFACard data={results.efa} />
              </div>
              <div className="p-5 rounded-xl bg-card border border-border">
                <FactorStructure data={results.efa} />
              </div>
            </div>
          )}

          {activeTab === "stability" && (
            <div className="p-5 rounded-xl bg-card border border-border">
              <StabilityCard data={results.stability} />
            </div>
          )}
        </div>

        {/* Export bar */}
        <ExportBar />
      </div>
    );
  }

  // ---- Error ----
  if (pipelineState === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-red-400" strokeWidth={1.5} />
        </div>
        <p className="text-sm text-destructive">分析过程出现错误</p>
        <p className="text-xs text-muted-foreground">请检查数据格式后重试</p>
      </div>
    );
  }

  return null;
}
