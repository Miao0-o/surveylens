"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { STAGE_LABELS } from "@/types";
import { analysisRegistry } from "@/lib/analysis-registry";
import { DataPreview } from "@/components/preprocessing/data-preview";
import { OverviewDashboard } from "@/components/analysis/overview-dashboard";
import { FileSpreadsheet, BarChart3 } from "lucide-react";
import { ExportBar } from "@/components/export/export-bar";

export function CenterPanel() {
  const rawData = useAppStore((s) => s.rawData);
  const pipelineState = useAppStore((s) => s.pipelineState);
  const analysisStage = useAppStore((s) => s.analysisStage);
  const results = useAppStore((s) => s.results);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Build snippet map from registry summarize functions
  const snippets = useMemo(() => {
    if (!results) return {} as Record<string, string | null>;
    const map: Record<string, string | null> = {};
    for (const mod of analysisRegistry) {
      map[mod.id] = mod.summarize(results);
    }
    return map;
  }, [results]);

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

  if (pipelineState === "idle") {
    return <DataPreview />;
  }

  if (pipelineState === "processing" || pipelineState === "ai_processing") {
    const label = STAGE_LABELS[analysisStage] ?? "处理中...";
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-foreground font-medium text-center">
          {pipelineState === "ai_processing" ? "AI 解读中" : label}
        </p>
      </div>
    );
  }

  if (pipelineState === "completed" && results) {
    return (
      <div id="report-content" className="space-y-5">
        {/* Tab navigation — dynamic from registry */}
        <div className="flex gap-1 p-0.5 rounded-lg bg-secondary/30 w-fit overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap ${
              activeTab === "overview" ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            概览
          </button>
          {analysisRegistry.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setActiveTab(mod.id)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap ${
                activeTab === mod.id ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mod.label}
            </button>
          ))}
        </div>

        {/* Tab content — dynamic from registry */}
        <div className="space-y-5">
          {activeTab === "overview" && <OverviewDashboard results={results} />}

          {analysisRegistry.map((mod) => (
            activeTab === mod.id && (
              <mod.card key={mod.id} results={results} snippet={snippets[mod.id] ?? undefined} />
            )
          ))}
        </div>

        <ExportBar />
      </div>
    );
  }

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
