"use client";

import { useAppStore } from "@/lib/store";

export function LanguageToggle() {
  const lang = useAppStore((s) => s.reportLanguage);
  const setLang = useAppStore((s) => s.setReportLanguage);

  return (
    <div className="flex rounded-md bg-secondary/50 p-0.5">
      <button
        onClick={() => setLang("zh")}
        className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
          lang === "zh" ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground"
        }`}
      >
        中文
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
          lang === "en" ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}
