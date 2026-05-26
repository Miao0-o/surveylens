"use client";

import { useState } from "react";
import { FileText, Download, Printer, Loader2, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { downloadExcel } from "@/lib/export/excel-generator";
import { printPDF } from "@/lib/export/pdf-generator";

type ExportStatus = "idle" | "loading" | "done";

export function ExportBar() {
  const results = useAppStore((s) => s.results);
  const aiResults = useAppStore((s) => s.aiResults);
  const researchGoal = useAppStore((s) => s.researchGoal);
  const lang = useAppStore((s) => s.reportLanguage);
  const [excelStatus, setExcelStatus] = useState<ExportStatus>("idle");
  const [pdfStatus, setPdfStatus] = useState<ExportStatus>("idle");

  if (!results) return null;

  const handleExcel = async () => {
    setExcelStatus("loading");
    try {
      await downloadExcel(results, aiResults);
      setExcelStatus("done");
      setTimeout(() => setExcelStatus("idle"), 2000);
    } catch (err) {
      console.error("Excel export failed:", err);
      setExcelStatus("idle");
    }
  };

  const handlePDF = () => {
    setPdfStatus("done");
    printPDF(results, aiResults, researchGoal, lang);
    setTimeout(() => setPdfStatus("idle"), 2000);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/30 border border-border/50">
      <span className="text-[11px] text-muted-foreground mr-1">导出结果</span>

      <button
        onClick={handleExcel}
        disabled={excelStatus === "loading"}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground
          hover:bg-secondary/50 transition-colors disabled:opacity-50"
      >
        {excelStatus === "loading" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
        ) : excelStatus === "done" ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
        ) : (
          <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
        )}
        Excel
      </button>

      <button
        onClick={handlePDF}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground
          hover:bg-secondary/50 transition-colors"
      >
        {pdfStatus === "done" ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
        ) : (
          <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
        )}
        PDF
      </button>
    </div>
  );
}
