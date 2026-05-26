// ============================================================
// Analysis Module Type System
// ============================================================

import type { AnalysisResults } from "@/types";
import type { ComponentType, ReactNode } from "react";

// ---- Analysis Intent ----
export type AnalysisIntent =
  | "explore"      // descriptive stats + distributions
  | "validate"     // reliability + validity + EFA
  | "compare"      // t-test + ANOVA
  | "relationship" // correlation + regression
  | "predict";     // logistic regression

export const INTENT_LABELS: Record<AnalysisIntent, string> = {
  explore: "探索数据",
  validate: "量表验证",
  compare: "组间比较",
  relationship: "变量关系",
  predict: "预测建模",
};

// ---- Module Interface ----
export interface AnalysisModule {
  id: string;
  label: string;
  /** Which intents trigger this module */
  intents: AnalysisIntent[];
  /** Python step ID that produces this module's data */
  sourceStep: string;
  /** Required data shape for this module to render */
  isAvailable: (results: AnalysisResults) => boolean;
  /** Generate one-line APA insight from results */
  apaInsight: (results: AnalysisResults, lang: "zh" | "en") => string | null;
}

// ---- Unified Result Card Props ----
export interface ResultCardProps {
  title: string;
  icon?: ReactNode;
  insight?: string | null;
  children: ReactNode;
  expanded?: ReactNode;
}
