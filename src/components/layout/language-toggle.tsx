"use client";

import { useAppStore } from "@/lib/store";

export function LanguageToggle() {
  const lang = useAppStore((s) => s.reportLanguage);
  const setLang = useAppStore((s) => s.setReportLanguage);

  return (
    <button
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      className="inline-flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      title={lang === "zh" ? "切换到英文报告" : "Switch to Chinese report"}
    >
      {lang === "zh" ? "中" : "EN"}
    </button>
  );
}
