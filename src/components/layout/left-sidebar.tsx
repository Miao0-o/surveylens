"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { FileUploader } from "@/components/upload/file-uploader";
import { ResearchInfo } from "@/components/upload/research-info";
import { MissingHandler } from "@/components/preprocessing/missing-handler";
import { ReverseDetector } from "@/components/preprocessing/reverse-detector";
import { DimensionManager } from "@/components/preprocessing/dimension-manager";
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
  const hasLikert = useAppStore((s) => s.likertColumns.length > 0);
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
              className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-md text-[10px] transition-colors
                ${
                  isActive
                    ? "bg-card text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
            >
              {isDone && !isActive ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />
              ) : (
                <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
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
            {hasData && <ResearchInfo />}
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
        {hasData && !hasLikert && (
          <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-[10px] text-amber-600 text-center">
              未检测到 Likert 题项（需 2-7 级数值列）。
              <br />
              请确认数据中包含量表题项。
            </p>
          </div>
        )}
        <PipelineControl />
        <p className="text-[10px] text-muted-foreground text-center">
          {!hasData
            ? "请上传数据文件（CSV / Excel / Qualtrics）"
            : pipelineState === "completed"
              ? "分析完成"
              : pipelineState === "error"
                ? "分析出错，请重试"
                : activeStep === "upload"
                  ? "继续配置数据清洗与维度"
                  : "就绪，点击开始分析"}
        </p>
      </div>
    </div>
  );
}
