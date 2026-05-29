"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useAppStore } from "@/lib/store";
import { STAGE_LABELS, type AnalysisStage } from "@/types";

const STAGE_LABELS_EN: Record<AnalysisStage, string> = {
  idle: "",
  uploading: "Reading file...",
  parsing: "Parsing data...",
  cleaning: "Detecting missing values & reverse items...",
  grouping: "Building dimension groups...",
  reliability: "Computing Cronbach's α...",
  validity: "Running Bartlett's test...",
  efa: "Generating factor structure...",
  descriptive: "Computing descriptive statistics...",
  correlation: "Computing correlation matrix...",
  stability: "Running bootstrap stability...",
  ai: "AI interpreting...",
  completed: "Complete",
  error: "Error",
};
import { detectAnalysisMode, getActiveModulesForMode, getOneLineAPA } from "@/lib/analysis/registry";
import { DataPreview } from "@/components/preprocessing/data-preview";
import { OverviewDashboard } from "@/components/analysis/overview-dashboard";
import { ResultCard } from "@/components/analysis/result-card";
import { ReliabilityCard } from "@/components/analysis/reliability-card";
import { ValidityCard } from "@/components/analysis/validity-card";
import { CorrelationHeatmap } from "@/components/analysis/correlation-heatmap";
import { EFACard } from "@/components/analysis/efa-card";
import { FactorStructure } from "@/components/analysis/factor-structure";
import { ConstructValiditySummary } from "@/components/analysis/construct-validity-summary";
import { StabilityCard } from "@/components/analysis/stability-card";
import { ScaleConsistencyCard } from "@/components/analysis/scale-consistency-card";
import { ProblematicItemsCard } from "@/components/analysis/problematic-items-card";
import { ImprovementRecommendations } from "@/components/analysis/improvement-recommendations";
import { DescriptiveCard } from "@/components/analysis/descriptive-card";
import { DiagnosticDashboard } from "@/components/analysis/diagnostic-dashboard";
import { AnalysisMatrixCard } from "@/components/analysis/analysis-matrix-card";
import { FileSpreadsheet, BarChart3 } from "lucide-react";
import { ExportBar } from "@/components/export/export-bar";
import { CopyActionBar } from "@/components/analysis/copy-action-bar";
import { ChartWrapper } from "@/components/analysis/chart-wrapper";
import { getSummaryAPA } from "@/lib/analysis/registry";
import { t } from "@/lib/i18n";

export function CenterPanel() {
  const rawData = useAppStore((s) => s.rawData);
  const pipelineState = useAppStore((s) => s.pipelineState);
  const analysisStage = useAppStore((s) => s.analysisStage);
  const results = useAppStore((s) => s.results);
  const descriptiveResults = useAppStore((s) => s.descriptiveResults);
  const columns = useAppStore((s) => s.columns);
  const researchDesign = useAppStore((s) => s.researchDesign);
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";
  const [activeTab, setActiveTab] = useState<string>("overview");

  const tl = (key: string) => t(key, lang);

  const analysisMode = detectAnalysisMode(researchDesign);
  const activeModules = useMemo(() => results ? getActiveModulesForMode(results, analysisMode) : [], [results, analysisMode]);
  const insights = useMemo(() => results ? getOneLineAPA(results, lang) : {}, [results, lang]);
  const summaryZH = useMemo(() => results ? getSummaryAPA(results, "zh") : "", [results]);
  const summaryEN = useMemo(() => results ? getSummaryAPA(results, "en") : "", [results]);

  // ---- States ----
  if (!rawData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <FileSpreadsheet className="w-16 h-16" strokeWidth={1} />
        <p className="text-base font-medium">{en ? "Upload data to preview and analyze here" : "上传数据后将在此处显示数据预览与分析结果"}</p>
        <p className="text-sm text-muted-foreground/60">{en ? "Supports .csv · .xlsx · .xls · Qualtrics exports" : "支持 .csv · .xlsx · .xls · Qualtrics 导出"}</p>
      </div>
    );
  }

  if (pipelineState === "idle") return <DataPreview />;

  if (pipelineState === "processing" || pipelineState === "ai_processing") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-foreground font-medium text-center">
          {pipelineState === "ai_processing"
            ? (en ? "AI Interpreting..." : "AI 解读中")
            : en
              ? (STAGE_LABELS_EN[analysisStage] ?? "Processing...")
              : STAGE_LABELS[analysisStage] ?? "处理中..."}
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
        <p className="text-sm text-destructive">{en ? "Analysis error occurred" : "分析过程出现错误"}</p>
        <p className="text-xs text-muted-foreground">{en ? "Check your data format and retry" : "请检查数据格式后重试"}</p>
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
          {tl("tab.overview")}
        </TabBtn>
        {activeModules.filter(m => m.id !== "validity").map((m) => (
          <TabBtn key={m.id} active={activeTab === m.id} onClick={() => setActiveTab(m.id)}>
            {t(`tab.${m.id}`, lang)}
          </TabBtn>
        ))}
        {/* Validity tab — always visible, lock icon when unavailable */}
        <TabBtn active={activeTab === "validity"} onClick={() => setActiveTab("validity")}>
          <span className="flex items-center gap-1">
            {t("tab.validity", lang)}
            {analysisMode !== "multi" && (
              <span className="text-[9px] opacity-40" title={en ? "Requires 2+ scales" : "需要至少 2 个量表"}>🔒</span>
            )}
          </span>
        </TabBtn>
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <DiagnosticDashboard />
          <AnalysisMatrixCard />
          <OverviewDashboard results={results} />
          <ProblematicItemsCard results={results} columns={columns} />
          <ImprovementRecommendations results={results} />
        </div>
      )}

      {activeTab === "reliability" && (
        results.reliability._meta.status === "ok" ? (
          <ResultCard title={t("section.reliability", lang)} insight={insights["reliability"]}>
            <ReliabilityCard data={results.reliability} />
          </ResultCard>
        ) : (
          <UnavailableCard
            title={t("section.reliability", lang)}
            reason={results.reliability._meta.reason}
          />
        )
      )}

      {/* Factor Analysis: KMO + Bartlett + EFA — item-level latent structure */}
      {activeTab === "factor-analysis" && (
        <div className="space-y-5">
          {results.validity._meta.status === "ok" ? (
            <ResultCard title={t("section.factor-analysis", lang)} insight={insights["factor-analysis"]}>
              <ValidityCard data={results.validity} />
            </ResultCard>
          ) : (
            <UnavailableCard
              title={t("section.factor-analysis", lang)}
              reason={results.validity._meta.reason}
            />
          )}
          {results.efa._meta.status === "ok" ? (
            <div className="space-y-5">
              <div className="space-y-4">
                <EFACard data={results.efa} />
                <FactorStructure data={results.efa} />
              </div>
              {/* Factor interpretation safety: warn when many factors found in Quick Mode */}
              {analysisMode === "exploratory" && results.efa.suggestedFactors > 10 && (
                <div className="rounded-lg bg-amber-50/40 border border-amber-100/50 p-3 text-[11px] text-amber-700">
                  <p className="font-medium mb-1">{en ? "Interpret with Caution" : "谨慎解读"}</p>
                  <p>
                    {en
                      ? `Kaiser criterion suggests ${results.efa.suggestedFactors} factors, which likely reflects multiple underlying constructs. This is an exploratory result — do not use as a definitive factor count. Define scales in Custom Mode for construct-level factor analysis.`
                      : `Kaiser 准则建议 ${results.efa.suggestedFactors} 个因子，这很可能反映多个潜在构念。此为探索性结果——请勿作为确定因子数。在自定义模式中定义量表可进行构念级因子分析。`}
                  </p>
                </div>
              )}
              {analysisMode === "multi" && <ScaleConsistencyCard results={results} />}
            </div>
          ) : results.validity._meta.status === "ok" ? null : (
            <UnavailableCard
              title={t("section.factor-analysis", lang)}
              reason={results.efa._meta.reason}
            />
          )}
        </div>
      )}

      {/* Validity: scale-level correlation heatmap + relationship interpretation */}
      {activeTab === "validity" && (
        analysisMode !== "multi" ? (
          /* Disabled: show why validity is unavailable */
          <div className="rounded-xl bg-card border border-border p-6 space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-secondary/50 flex items-center justify-center">
              <span className="text-xl">🔒</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                {en ? "Construct Validity Not Available" : "构念效度暂不可用"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {en
                  ? "Construct validity analysis requires comparison between multiple defined scales."
                  : "构念效度分析需要在多个已定义的量表之间进行比较。"}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/20 border border-border/50 p-3 text-left text-xs space-y-1.5 max-w-sm mx-auto">
              <p className="font-medium text-foreground">{en ? "Requirements" : "需要满足"}:</p>
              <p className="text-muted-foreground">✓ {en ? "At least 2 defined scales" : "至少 2 个已定义量表"}</p>
              <p className="text-muted-foreground">✓ {en ? "Scale-level variables available" : "量表级变量可用"}</p>
              <div className="border-t border-border/30 pt-1.5 mt-1.5">
                <p className="text-muted-foreground/70">
                  {en ? "Current: " : "当前: "}
                  <strong>{analysisMode === "single" ? (en ? "1 scale detected" : "检测到 1 个量表") : (en ? "No scales defined" : "未定义量表")}</strong>
                </p>
              </div>
            </div>
            <p className="text-[11px] text-blue-600/70">
              {en
                ? "How to unlock: Switch to Custom Mode → Create 2+ composite scales → Re-run analysis"
                : "如何解锁：切换到自定义模式 → 创建 ≥ 2 个复合量表 → 重新分析"}
            </p>
          </div>
        ) : (
          results.validity.correlationMatrix.length > 0 ? (
          <ResultCard title={t("section.construct-validity", lang)} insight={insights["validity"]}>
            <div className="space-y-4">
              <ChartWrapper title={t("section.heatmap", lang)}>
                <CorrelationHeatmap data={results.validity} />
              </ChartWrapper>
              <ConstructValiditySummary
                correlationMatrix={results.validity.correlationMatrix}
                columnLabels={results.validity.columnLabels}
                sampleSize={results.meta.sampleSize}
              />
            </div>
          </ResultCard>
        ) : (
          <UnavailableCard
            title={t("section.construct-validity", lang)}
            reason={lang === "en" ? "Correlation matrix not available." : "相关矩阵不可用"}
          />
        )
      )
      )}

      {activeTab === "descriptive" && descriptiveResults && (
        <ResultCard title={t("section.descriptive", lang)} insight={insights["descriptive"]}>
          <DescriptiveCard
            data={descriptiveResults as unknown as { n: number; mean: number | null; sd: number | null; min: number | null; max: number | null; skew: number | null; kurtosis: number | null }[]}
            labels={results.efa.itemLabels}
          />
        </ResultCard>
      )}

      {activeTab === "stability" && (
        <ResultCard title={t("section.stability", lang)} insight={insights["stability"]}>
          <StabilityCard data={results.stability} />
        </ResultCard>
      )}

      {/* Quick copy bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-secondary/30 border border-border/50">
        <span className="text-[10px] text-muted-foreground shrink-0">{tl("btn.quickCopy")}</span>
        <CopyActionBar
          actions={[
            { label: tl("btn.copySummary"), icon: "text", getContent: () => summaryZH },
            { label: tl("btn.copySummaryEN"), icon: "text", getContent: () => summaryEN },
          ]}
        />
      </div>

      <ExportBar />
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
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

function UnavailableCard({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary/20 border border-border/50">
        <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
          <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{reason}</p>
        </div>
      </div>
    </div>
  );
}
