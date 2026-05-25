"use client";

import type { ReactNode } from "react";

interface Props {
  title: string;
  icon?: ReactNode;
  insight?: string | null;
  children: ReactNode;
  expanded?: ReactNode;
}

export function ResultCard({ title, icon, insight, children, expanded }: Props) {
  return (
    <div className="p-5 rounded-xl bg-card border border-border space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>

      {/* Chart / Table / Stats */}
      <div>{children}</div>

      {/* APA One-Line Insight */}
      {insight && (
        <p className="text-[11px] text-muted-foreground italic leading-relaxed border-l-2 border-muted-foreground/15 pl-2.5">
          {insight}
        </p>
      )}

      {/* Optional Expanded Section */}
      {expanded && (
        <details className="group">
          <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            展开详情
          </summary>
          <div className="mt-2 pt-2 border-t border-border">{expanded}</div>
        </details>
      )}
    </div>
  );
}
