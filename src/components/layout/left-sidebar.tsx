"use client";

import { useAppStore } from "@/lib/store";
import { FileUploader } from "@/components/upload/file-uploader";
import { CodebookUploader } from "@/components/upload/codebook-uploader";
import { GuidedResearchSetup } from "@/components/upload/guided-research-setup";
import { ResearchDesignReview } from "@/components/upload/research-design-review";
import { MissingHandler } from "@/components/preprocessing/missing-handler";
import { ReverseDetector } from "@/components/preprocessing/reverse-detector";
import { DimensionManager } from "@/components/preprocessing/dimension-manager";
import type { ClassificationResult } from "@/lib/stats/data-classifier";
import {
  Upload,
  Wrench,
  Layers,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { PipelineControl } from "@/components/analysis/pipeline-control";

type LeftStep = "upload" | "preprocess" | "dimensions";

interface StepDef { id: LeftStep; labelZh: string; labelEn: string; icon: typeof Upload }

const STEPS: StepDef[] = [
  { id: "upload", labelZh: "上传数据", labelEn: "Upload", icon: Upload },
  { id: "preprocess", labelZh: "数据清洗", labelEn: "Cleaning", icon: Wrench },
  { id: "dimensions", labelZh: "维度管理", labelEn: "Dimensions", icon: Layers },
];

const L = {
  quick: { zh: "快速", en: "Quick" },
  custom: { zh: "自定义", en: "Custom" },
  quickDesc: { zh: "上传即分析，AI 自动识别变量与模型", en: "Upload and analyze — AI auto-detects variables" },
  customDesc: { zh: "可选填研究设计，获得理论对齐解读", en: "Optionally define research design for theory-aligned interpretation" },
  uploadPrompt: { zh: "请上传 .csv / .xlsx / .sav / Qualtrics 文件", en: "Upload .csv / .xlsx / .sav / Qualtrics file" },
  analysisDone: { zh: "分析完成", en: "Analysis complete" },
  analysisError: { zh: "分析出错，请重试", en: "Analysis error — retry" },
  quickFlow: { zh: "上传 → 分析 → 出结果", en: "Upload → Analyze → Results" },
  noDesign: { zh: "请完成研究设计设置", en: "Complete research design setup" },
  confirmDesign: { zh: "请在「研究设计确认」中点击确认", en: "Confirm your research design below" },
  continueSetup: { zh: "继续配置数据清洗与维度", en: "Continue to data cleaning & dimensions" },
  ready: { zh: "就绪，点击开始分析", en: "Ready — click to start analysis" },
  autoExcluded: { zh: "已自动排除", en: "Auto-excluded" },
  nonScale: { zh: "个非量表列", en: "non-scale columns" },
  autoDetect: { zh: "自动检测结果", en: "Auto-detected" },
  likertFound: { zh: "已识别", en: "Identified" },
  likertSuffix: { zh: "个 Likert 题项，将自动进行分析", en: "Likert items — ready for analysis" },
  nonScaleExcluded: { zh: "已排除", en: "Excluded" },
  nonScaleSuffix: { zh: "个非量表列", en: "non-scale columns" },
};

export function LeftSidebar() {
  const lang = useAppStore((s) => s.reportLanguage);
  const pipelineState = useAppStore((s) => s.pipelineState);
  const hasData = useAppStore((s) => s.rawData !== null);
  const codebook = useAppStore((s) => s.codebook);
  const setCodebook = useAppStore((s) => s.setCodebook);
  const design = useAppStore((s) => s.researchDesign);
  const designConfirmed = useAppStore((s) => s.designConfirmed);
  const classification = useAppStore((s) => s.classification);
  const analysisMode = useAppStore((s) => s.analysisMode);
  const setAnalysisMode = useAppStore((s) => s.setAnalysisMode);
  const activeStep = useAppStore((s) => s.leftStep) as LeftStep;
  const setActiveStep = useAppStore((s) => s.setLeftStep);
  const en = lang === "en";
  const t = (v: { zh: string; en: string }) => en ? v.en : v.zh;

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Mode toggle — simple two-option switch */}
      <div className="flex rounded-lg bg-secondary/50 p-0.5">
        <button
          onClick={() => setAnalysisMode("quick")}
          className={`flex-1 flex items-center justify-center gap-1 px-2.5 py-2 rounded-md text-xs transition-colors ${
            analysisMode === "quick" ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
          {t(L.quick)}
        </button>
        <button
          onClick={() => setAnalysisMode("custom")}
          className={`flex-1 flex items-center justify-center gap-1 px-2.5 py-2 rounded-md text-xs transition-colors ${
            analysisMode === "custom" ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wrench className="w-3.5 h-3.5" strokeWidth={1.5} />
          {t(L.custom)}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground/60 -mt-4 px-1">
        {analysisMode === "quick" ? t(L.quickDesc) : t(L.customDesc)}
      </p>

      {/* Step navigation */}
      <nav className="flex gap-1 p-0.5 rounded-lg bg-secondary/50">
        {STEPS.map(({ id, labelZh, labelEn, icon: Icon }) => {
          const label = en ? labelEn : labelZh;
          const isActive = activeStep === id;
          const isDone =
            (id === "upload" && hasData) ||
            (id === "preprocess" && hasData) ||
            false;
          return (
            <button
              key={id}
              onClick={() => setActiveStep(id)}
              disabled={id !== "upload" && !hasData}
              className={`flex-1 flex flex-col items-center gap-1 px-2.5 py-2.5 rounded-md text-xs transition-colors
                ${
                  isActive
                    ? "bg-card text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
            >
              {isDone && !isActive ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
              ) : (
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              )}
              {label}
            </button>
          );
        })}
      </nav>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {activeStep === "upload" && (
          <div className="space-y-4">
            <FileUploader />
            <CodebookUploader
              codebook={codebook}
              onChange={setCodebook}
            />
            {/* Research setup: only in custom mode */}
            {hasData && analysisMode === "custom" && <GuidedResearchSetup />}
            {hasData && analysisMode === "custom" && design?.analysisIntent && design.outcomeVariables.length > 0 && (
              <>
                <hr className="border-border" />
                <ResearchDesignReview />
              </>
            )}
            {/* Quick mode: simple auto-detect summary */}
            {hasData && analysisMode === "quick" && (
              <QuickModeSummary />
            )}
          </div>
        )}

        {activeStep === "preprocess" && hasData && (
          <div className="space-y-5">
            <MissingHandler />
            <hr className="border-border" />
            <ReverseDetector />
          </div>
        )}

        {activeStep === "dimensions" && hasData && (
          <DimensionManager />
        )}
      </div>

      {/* Bottom actions */}
      <div className="space-y-2 shrink-0">
        <hr className="border-border" />
        {hasData && <DataClassificationWarnings />}
        <PipelineControl />
        <p className="text-xs text-muted-foreground text-center">
          {!hasData
            ? t(L.uploadPrompt)
            : pipelineState === "completed"
              ? t(L.analysisDone)
              : pipelineState === "error"
                ? t(L.analysisError)
              : analysisMode === "quick"
                ? t(L.quickFlow)
                : !design?.outcomeVariables?.length
                  ? t(L.noDesign)
                  : !designConfirmed
                    ? t(L.confirmDesign)
                    : activeStep === "upload"
                      ? t(L.continueSetup)
                      : t(L.ready)}
        </p>
      </div>
    </div>
  );
}

function DataClassificationWarnings() {
  const classification = useAppStore((s) => s.classification);
  const en = useAppStore((s) => s.reportLanguage) === "en";
  if (!classification || classification.warnings.length === 0) return null;

  const isMetadataOnly = classification.datasetType === "metadata_only";
  const isInsufficient = classification.datasetType === "insufficient";

  return (
    <div className="space-y-1.5">
      {classification.warnings.map((w, i) => (
        <div
          key={i}
          className={`px-3 py-2 rounded-lg border text-xs ${
            isMetadataOnly || isInsufficient
              ? "bg-red-50 border-red-100 text-red-600"
              : "bg-amber-50 border-amber-100 text-amber-600"
          }`}
        >
          {w}
        </div>
      ))}
      {classification.metadataColumns.length > 0 && classification.itemColumns.length > 0 && (
        <p className="text-[10px] text-muted-foreground px-1">
          {en ? "Auto-excluded " : "已自动排除 "}
          {classification.metadataColumns.length}
          {en ? " non-scale columns: " : " 个非量表列："}
          {classification.metadataColumns.slice(0, 3).join(", ")}
          {classification.metadataColumns.length > 3 ? " ..." : ""}
        </p>
      )}
    </div>
  );
}

function QuickModeSummary() {
  const likertColumns = useAppStore((s) => s.likertColumns);
  const classification = useAppStore((s) => s.classification);
  const en = useAppStore((s) => s.reportLanguage) === "en";

  if (likertColumns.length === 0) return null;

  return (
    <div className="px-3 py-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Zap className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
        <span className="text-xs font-medium text-emerald-700">
          {en ? "Auto-detected" : "自动检测结果"}
        </span>
      </div>
      <p className="text-[11px] text-emerald-600/80">
        {en
          ? `Identified ${likertColumns.length} Likert items — ready for analysis`
          : `已识别 ${likertColumns.length} 个 Likert 题项，将自动进行分析`}
      </p>
      {classification && classification.metadataColumns.length > 0 && (
        <p className="text-[10px] text-emerald-500/60 mt-1">
          {en
            ? `Excluded ${classification.metadataColumns.length} non-scale columns`
            : `已排除 ${classification.metadataColumns.length} 个非量表列`}
        </p>
      )}
    </div>
  );
}
