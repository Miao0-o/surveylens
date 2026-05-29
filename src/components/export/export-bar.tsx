"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Printer, Loader2, CheckCircle2, FileText, ChevronDown, Clipboard } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { downloadExcel } from "@/lib/export/excel-generator";
import { printPDF } from "@/lib/export/pdf-generator";
import { downloadAPAResults, downloadMarkdownReport, downloadQuartoReport, apaResultsText } from "@/lib/export/report-generators";

export function ExportBar() {
  const results = useAppStore((s) => s.results);
  const aiResults = useAppStore((s) => s.aiResults);
  const researchGoal = useAppStore((s) => s.researchGoal);
  const lang = useAppStore((s) => s.reportLanguage);
  const en = lang === "en";

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!results) return null;

  const done = (key: string) => { setStatus(key); setTimeout(() => setStatus(null), 2000); };

  const items = [
    {
      key: "pdf", label: en ? "PDF Report" : "PDF 报告", icon: Printer,
      action: () => { printPDF(results, aiResults, researchGoal, lang); done("pdf"); },
    },
    {
      key: "apa-copy", label: en ? "Copy APA to Clipboard" : "复制 APA 到剪贴板", icon: Clipboard,
      action: () => {
        navigator.clipboard.writeText(apaResultsText(results, lang)).then(() => done("apa-copy"));
      },
    },
    {
      key: "apa", label: en ? "Download APA (.txt)" : "下载 APA (.txt)", icon: Download,
      action: () => { downloadAPAResults(results, lang); done("apa"); },
    },
    {
      key: "md", label: en ? "Markdown Report" : "Markdown 报告", icon: FileText,
      action: () => { downloadMarkdownReport(results, aiResults, lang); done("md"); },
    },
    {
      key: "qmd", label: en ? "Quarto Report" : "Quarto 报告", icon: FileText,
      action: () => { downloadQuartoReport(results, aiResults, lang); done("qmd"); },
    },
    {
      key: "xlsx", label: en ? "Raw Statistics (.xlsx)" : "原始统计 (.xlsx)", icon: Download,
      action: async () => {
        setStatus("xlsx");
        try { await downloadExcel(results, aiResults); done("xlsx"); }
        catch { setStatus(null); }
      },
    },
  ];

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/30 border border-border/50">
      <span className="text-[11px] text-muted-foreground mr-1">{en ? "Export" : "导出"}</span>

      {/* Quick Copy APA — most common academic workflow */}
      <button
        onClick={() => {
          navigator.clipboard.writeText(apaResultsText(results, lang)).then(() => done("apa-quick"));
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground hover:bg-secondary/50 transition-colors"
        title={en ? "Copy APA results to clipboard" : "复制 APA 结果到剪贴板"}
      >
        {status === "apa-quick" ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
        ) : (
          <Clipboard className="w-3.5 h-3.5" strokeWidth={1.5} />
        )}
        {en ? "Copy APA" : "复制 APA"}
      </button>

      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground hover:bg-secondary/50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
          {en ? "Export Report" : "导出报告"}
          <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
        </button>

        {open && (
          <div className="absolute bottom-full mb-1 left-0 w-52 rounded-lg bg-card border border-border shadow-lg py-1 z-50">
            {items.map((item) => (
              <button
                key={item.key}
                onClick={() => { item.action(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary/30 transition-colors text-left"
              >
                {status === item.key ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={1.5} />
                ) : status === "xlsx" && item.key === "xlsx" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" strokeWidth={1.5} />
                ) : (
                  <item.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                )}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
