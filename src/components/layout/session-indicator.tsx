"use client";

import { useAppStore } from "@/lib/store";

export function SessionIndicator() {
  const rawData = useAppStore((s) => s.rawData);

  if (!rawData) return null;

  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <span>数据已本地保存 · {rawData.rowCount} 行</span>
    </div>
  );
}

