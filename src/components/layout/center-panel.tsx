"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { STAGE_LABELS } from "@/types";
import { getActiveModules, getOneLineAPA } from "@/lib/analysis/registry";
import { DataPreview } from "@/components/preprocessing/data-preview";
import { OverviewDashboard } from "@/components/analysis/overview-dashboard";
import { ResultCard } from "@/components/analysis/result-card";
import { ReliabilityCard } from "@/components/analysis/reliability-card";
import { ValidityCard } from "@/components/analysis/validity-card";
import { CorrelationHeatmap } from "@/components/analysis/correlation-heatmap";
import { EFACard } from "@/components/analysis/efa-card";
import { FactorStructure } from "@/components/analysis/factor-structure";
import { StabilityCard } from "@/components/analysis/stability-card";
import { DescriptiveCard } from "@/components/analysis/descriptive-card";
import { FileSpreadsheet, BarChart3 } from "lucide-react";
import { ExportBar } from "@/components/export/export-bar";

export function CenterPanel() {
  const rawData = useAppStore((s) => s.rawData);
  const pipelineState = useAppStore((s) => s.pipelineState);
  const analysisStage = useAppStore((s) => s.analysisStage);
  const results = useAppStore((s) => s.results);
  const descriptiveResults = useAppStore((s) => s.descriptiveResults);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const activeModules = useMemo(() => results ? getActiveModules(results) : [], [results]);
  const insights = useMemo(() => results ? getOneLineAPA(results) : {}, [results]);

  // ---- States ----
  if (!rawData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <FileSpreadsheet className="w-16 h-16" strokeWidth={1} />
        <p className="text-base font-medium">上传数据后将在此处显示数据预览与分析结果</p>
        <p className="text-sm text-muted-foreground/60">支持 .csv · .xlsx · .xls · Qualtrics 导出</p>
      </div>
    );
  }

  if (pipelineState === "idle") return <DataPreview />;

  if (pipelineState === "processing" || pipelineState === "ai_processing") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-foreground font-medium text-center">
          {pipelineState === "ai_processing" ? "AI 解读中" : STAGE_LABELS[analysisStage] ?? "处理中..."}
        </p>
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

  if (!results) return null;

  // ---- Results ----
  return (
    <div id="report-content" className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-0.5 rounded-lg bg-secondary/30 w-fit overflow-x-auto max-w-full">
        <TabBtn active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
          概览
        </TabBtn>
        {activeModules.map((m) => (
          <TabBtn key={m.id} active={activeTab === m.id} onClick={() => setActiveTab(m.id)}>
            {m.label}
          </TabBtn>
        ))}
      </div>

      {/* Content */}
      {activeTab === "overview" && <OverviewDashboard results={results} />}

      {activeTab === "reliability" && (
        <ResultCard title="信度分析" insight={insights["reliability"]}>
          <ReliabilityCard data={results.reliability} />
        </ResultCard>
      )}

      {activeTab === "validity" && (
        <ResultCard title="效度分析" insight={insights["validity"]}>
          <ValidityCard data={results.validity} />
          <div className="mt-4">
            <CorrelationHeatmap data={results.validity} />
          </div>
        </ResultCard>
      )}

      {activeTab === "efa" && (
        <ResultCard title="因子分析" insight={insights["efa"]}>
          <EFACard data={results.efa} />
          <div className="mt-4">
            <FactorStructure data={results.efa} />
          </div>
        </ResultCard>
      )}

      {activeTab === "descriptive" && descriptiveResults && (
        <ResultCard title="描述性统计" insight={insights["descriptive"]}>
          <DescriptiveCard
            data={descriptiveResults as unknown as { n: number; mean: number | null; sd: number | null; min: number | null; max: number | null; skew: number | null; kurtosis: number | null }[]}
            labels={results.efa.itemLabels}
          />
        </ResultCard>
      )}

      {activeTab === "correlation" && (
        <ResultCard title="相关性分析" insight={insights["correlation"]}>
          <CorrelationHeatmap data={results.validity} />
        </ResultCard>
      )}

      {activeTab === "stability" && (
        <ResultCard title="样本稳定性" insight={insights["stability"]}>
          <StabilityCard data={results.stability} />
        </ResultCard>
      )}

      <ExportBar />
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap ${
        active ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
