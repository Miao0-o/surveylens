// ============================================================
// Lightweight i18n — Chinese / English
// ============================================================

const dict: Record<string, Record<string, string>> = {
  // Nav
  "nav.title": { zh: "AI 信效度分析系统", en: "AI Reliability & Validity Analyzer" },
  "nav.aiSettings": { zh: "AI 设置", en: "AI Settings" },
  "nav.help": { zh: "帮助", en: "Help" },
  "nav.localMode": { zh: "仅本地模式", en: "Local Only" },
  "nav.aiReady": { zh: "AI Ready", en: "AI Ready" },
  "nav.aiOffline": { zh: "AI 离线", en: "AI Offline" },

  // Modes
  "mode.quick": { zh: "快速", en: "Quick" },
  "mode.custom": { zh: "自定义", en: "Custom" },
  "mode.quickDesc": { zh: "上传即分析，AI 自动识别变量与模型", en: "Upload & analyze instantly" },
  "mode.customDesc": { zh: "可选填研究设计，获得理论对齐解读", en: "Configure research design" },

  // Steps
  "step.upload": { zh: "上传数据", en: "Upload" },
  "step.clean": { zh: "数据清洗", en: "Clean" },
  "step.dimensions": { zh: "维度管理", en: "Dimensions" },

  // Tabs
  "tab.overview": { zh: "概览", en: "Overview" },
  "tab.descriptive": { zh: "描述", en: "Descriptive" },
  "tab.reliability": { zh: "信度", en: "Reliability" },
  "tab.validity": { zh: "效度", en: "Validity" },
  "tab.efa": { zh: "因子", en: "EFA" },
  "tab.correlation": { zh: "相关", en: "Correlation" },
  "tab.stability": { zh: "稳定性", en: "Stability" },

  // Buttons
  "btn.analyze": { zh: "开始分析", en: "Run Analysis" },
  "btn.reset": { zh: "重新分析", en: "Reset" },
  "btn.confirmReset": { zh: "确认重置", en: "Confirm Reset" },
  "btn.cancel": { zh: "取消", en: "Cancel" },
  "btn.export": { zh: "导出结果", en: "Export" },
  "btn.copyChart": { zh: "复制图表", en: "Copy Chart" },
  "btn.copySummary": { zh: "中文摘要", en: "CN Summary" },
  "btn.copySummaryEN": { zh: "English Summary", en: "EN Summary" },
  "btn.quickCopy": { zh: "快速复制", en: "Quick Copy" },
  "btn.generateAI": { zh: "生成完整解读", en: "Generate Full Report" },
  "btn.confirmDesign": { zh: "确认设计", en: "Confirm Design" },

  // Upload
  "upload.label": { zh: "上传数据", en: "Upload Data" },
  "upload.dropHint": { zh: "拖拽文件到此处，或点击选择", en: "Drag & drop or click to select" },
  "upload.formats": { zh: ".csv · .xlsx · .sav · Qualtrics", en: ".csv · .xlsx · .sav · Qualtrics" },
  "upload.parsing": { zh: "解析中...", en: "Parsing..." },

  // Empty states
  "empty.centerTitle": { zh: "上传数据后将在此处显示数据预览与分析结果", en: "Upload data to view preview and analysis" },
  "empty.centerDesc": { zh: "支持 .csv · .xlsx · .xls · Qualtrics 导出", en: "Supports .csv · .xlsx · .xls · Qualtrics" },

  // Processing
  "processing.stats": { zh: "处理中...", en: "Processing..." },
  "processing.ai": { zh: "AI 解读中", en: "AI Interpreting..." },

  // Right sidebar
  "right.aiTitle": { zh: "AI 解读", en: "AI Interpretation" },
  "right.aiReady": { zh: "AI 已就绪", en: "AI Ready" },
  "right.configureAI": { zh: "配置 API Key 启用 AI 解读", en: "Configure API Key for AI" },
  "right.afterAnalysis": { zh: "分析完成后，AI 可自动生成以下内容：", en: "After analysis, AI can generate:" },
  "right.statExplain": { zh: "统计指标解释", en: "Statistical Explanation" },
  "right.statExplainDesc": { zh: "α、KMO、Bartlett 等指标含义", en: "α, KMO, Bartlett interpretation" },
  "right.apaFormat": { zh: "APA 论文格式", en: "APA Format" },
  "right.apaFormatDesc": { zh: "可直接复制到学术论文中", en: "Ready for academic papers" },
  "right.diagnosis": { zh: "诊断与建议", en: "Diagnosis & Suggestions" },
  "right.diagnosisDesc": { zh: "识别问题题项，给出优化方案", en: "Identify issues, suggest fixes" },

  // AI Results
  "ai.explanation.simple": { zh: "通俗解释", en: "Simple Explanation" },
  "ai.explanation.academic": { zh: "学术解释", en: "Academic Interpretation" },
  "ai.diagnosis": { zh: "诊断与建议", en: "Diagnosis & Suggestions" },
  "ai.problems": { zh: "问题诊断", en: "Problem Diagnosis" },
  "ai.apaFull": { zh: "APA 完整格式", en: "APA Full Format" },
  "ai.apaSummary": { zh: "APA 摘要", en: "APA Summary" },
  "ai.lowReliability": { zh: "低信度题项", en: "Low Reliability Items" },
  "ai.crossLoading": { zh: "交叉载荷题项", en: "Cross-Loading Items" },
  "ai.generate": { zh: "AI 学术解读", en: "AI Academic Report" },
  "ai.chooseHint": { zh: "选择要生成的内容。AI 基于分析结果生成，原始数据不会上传。", en: "AI generates based on results. Raw data is never uploaded." },
  "ai.comingSoon": { zh: "分析完成后可生成 AI 学术解读", en: "AI interpretation available after analysis" },
  "ai.notCompleted": { zh: "分析未完成", en: "Analysis Incomplete" },
  "ai.retryHint": { zh: "请重试后查看 AI 解读", en: "Please retry analysis first" },
  "ai.unavailable": { zh: "AI 解读暂不可用", en: "AI Unavailable" },

  // Research
  "research.goal": { zh: "研究目标", en: "Research Goal" },
  "research.outcome": { zh: "结果变量", en: "Outcome Variables" },
  "research.predictor": { zh: "预测变量", en: "Predictors" },
  "research.theory": { zh: "理论框架", en: "Theoretical Framework" },
  "research.hypothesis": { zh: "研究假设", en: "Hypotheses" },
  "research.notes": { zh: "补充说明", en: "Additional Notes" },
  "research.confirmed": { zh: "研究设计已确认", en: "Design Confirmed" },
  "research.confirmedDesc": { zh: "分析将基于以上参数执行", en: "Analysis will follow this design" },
  "research.notConfirmed": { zh: "设计尚未确认", en: "Design Not Confirmed" },
  "research.notConfirmedDesc": { zh: "请检查以上研究参数是否正确。确认后将锁定设计。", en: "Please review and confirm the research design." },

  // Diagnostic
  "diag.title": { zh: "数据诊断报告", en: "Diagnostic Report" },
  "diag.confidence": { zh: "数据可信度", en: "Data Confidence" },
  "diag.quality": { zh: "数据质量", en: "Data Quality" },
  "diag.scale": { zh: "量表健康度", en: "Scale Health" },
  "diag.validity": { zh: "效度适配", en: "Validity Readiness" },
  "diag.recommended": { zh: "推荐分析", en: "Recommended" },
  "diag.suggestions": { zh: "建议与风险提示", en: "Suggestions & Warnings" },
  "diag.missingRate": { zh: "缺失率", en: "Missing Rate" },
  "diag.sampleSize": { zh: "样本量", en: "Sample Size" },
  "diag.good": { zh: "良好", en: "Good" },
  "diag.attention": { zh: "注意", en: "Caution" },
  "diag.warning": { zh: "需关注", en: "Warning" },
  "diag.problemItems": { zh: "问题题项", en: "Problem Items" },

  // Misc
  "misc.designLocked": { zh: "数据已本地保存 · ", en: "Saved locally · " },
  "misc.rows": { zh: " 行", en: " rows" },
  "misc.noData": { zh: "未指定", en: "Not specified" },
  "misc.computed": { zh: "计算", en: "Computed" },
  "misc.method": { zh: "方式", en: "Method" },
  "misc.source": { zh: "来源", en: "Source" },
  "misc.expandDetails": { zh: "展开详情", en: "Expand Details" },
  "misc.copied": { zh: "已复制", en: "Copied" },
  "misc.copy": { zh: "复制", en: "Copy" },
  "misc.error": { zh: "分析过程出现错误", en: "Analysis Error" },
  "misc.errorHint": { zh: "请检查数据格式后重试", en: "Check data format and retry" },
  "misc.noSignificant": { zh: "未检测到显著结果。", en: "No significant results to report." },
};

export function t(key: string, lang: "zh" | "en"): string {
  return dict[key]?.[lang] ?? dict[key]?.zh ?? key;
}

export function useT(lang: "zh" | "en") {
  return (key: string) => t(key, lang);
}
