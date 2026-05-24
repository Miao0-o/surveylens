"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { FileUploader } from "@/components/upload/file-uploader";
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
} from "lucide-react";
import { PipelineControl } from "@/components/analysis/pipeline-control";

type LeftStep = "upload" | "preprocess" | "dimensions";

const STEPS: { id: LeftStep; label: string; icon: typeof Upload }[] = [
  { id: "upload", label: "上传数据", icon: Upload },
  { id: "preprocess", label: "数据清洗", icon: Wrench },
  { id: "dimensions", label: "维度管理", icon: Layers },
];

export function LeftSidebar() {
  const pipelineState = useAppStore((s) => s.pipelineState);
  const hasData = useAppStore((s) => s.rawData !== null);
  const design = useAppStore((s) => s.researchDesign);
  const designConfirmed = useAppStore((s) => s.designConfirmed);
  const classification = useAppStore((s) => s.classification);
  const [activeStep, setActiveStep] = useState<LeftStep>("upload");

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Step navigation */}
      <nav className="flex gap-1 p-0.5 rounded-lg bg-secondary/50">
        {STEPS.map(({ id, label, icon: Icon }) => {
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
            {hasData && <GuidedResearchSetup />}
            {hasData && design?.analysisIntent && design.outcomeVariables.length > 0 && (
              <>
                <hr className="border-border" />
                <ResearchDesignReview />
              </>
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
            ? "请上传 .csv / .xlsx / .xls / Qualtrics 文件"
            : pipelineState === "completed"
              ? "分析完成"
              : pipelineState === "error"
                ? "分析出错，请重试"
              : !design?.outcomeVariables?.length
                ? "请完成研究设计设置"
                : !designConfirmed
                  ? "请在「研究设计确认」中点击确认"
                  : activeStep === "upload"
                    ? "继续配置数据清洗与维度"
                    : "就绪，点击开始分析"}
        </p>
      </div>
    </div>
  );
}

function DataClassificationWarnings() {
  const classification = useAppStore((s) => s.classification);
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
          已自动排除 {classification.metadataColumns.length} 个非量表列：
          {classification.metadataColumns.slice(0, 3).join(", ")}
          {classification.metadataColumns.length > 3 ? " ..." : ""}
        </p>
      )}
    </div>
  );
}
