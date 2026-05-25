"use client";

import Link from "next/link";
import { BarChart3, HelpCircle, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function AIStatusLabel() {
  const aiMode = useAppStore((s) => s.aiMode);

  if (aiMode === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        AI Ready
      </span>
    );
  }

  if (aiMode === "offline") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        AI 离线
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
      仅本地模式
    </span>
  );
}

export function TopNav() {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <BarChart3 className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            AI 信效度分析系统
          </span>
        </Link>
        <AIStatusLabel />
      </div>
      <nav className="flex items-center gap-1">
        <Link
          href="/settings/ai"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
          AI 设置
        </Link>
        <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2.5 py-1.5 transition-colors">
          <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
          帮助
        </button>
      </nav>
    </header>
  );
}
