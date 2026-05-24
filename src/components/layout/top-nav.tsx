"use client";

import { BarChart3, HelpCircle } from "lucide-react";

export function TopNav() {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2.5">
        <BarChart3 className="w-5 h-5 text-primary" strokeWidth={1.5} />
        <span className="text-sm font-semibold tracking-tight text-foreground">
          AI 信效度分析系统
        </span>
      </div>
      <nav className="flex items-center gap-1">
        <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5 py-1.5 transition-colors">
          <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
          帮助
        </button>
      </nav>
    </header>
  );
}
