"use client";

import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";

export function StatTooltip({ label, children }: { label: string; children: ReactNode }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex items-center cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="underline decoration-dotted underline-offset-2 decoration-muted-foreground/30">
        {label}
      </span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 p-2.5 rounded-lg bg-foreground text-background text-[10px] leading-relaxed shadow-lg pointer-events-none">
          {children}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-foreground" />
        </span>
      )}
    </span>
  );
}

/** Short inline info icon with tooltip */
export function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <Info className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground" strokeWidth={1.5} />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 p-2.5 rounded-lg bg-foreground text-background text-[10px] leading-relaxed shadow-lg pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-foreground" />
        </span>
      )}
    </span>
  );
}
