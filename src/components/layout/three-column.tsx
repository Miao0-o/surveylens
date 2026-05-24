"use client";

import type { ReactNode } from "react";

interface ThreeColumnProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function ThreeColumn({ left, center, right }: ThreeColumnProps) {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Sidebar — 280px */}
      <aside className="w-[280px] shrink-0 border-r border-border bg-card overflow-y-auto p-5">
        {left}
      </aside>

      {/* Center Panel — flexible */}
      <main className="flex-1 overflow-y-auto p-6 min-w-0">
        {center}
      </main>

      {/* Right Sidebar — 360px */}
      <aside className="w-[360px] shrink-0 border-l border-border bg-card overflow-y-auto p-5">
        {right}
      </aside>
    </div>
  );
}
