"use client";

import { useRef, type ReactNode } from "react";
import { CopyImageButton } from "./copy-action-bar";

interface Props {
  title?: string;
  children: ReactNode;
}

/** Wraps a chart/table with a [Copy Image] button that captures only this block */
export function ChartWrapper({ title, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative space-y-1.5">
      {title && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-foreground">{title}</p>
          <CopyImageButton targetRef={ref} label="复制图表" />
        </div>
      )}
      {!title && (
        <div className="absolute top-0 right-0 z-10">
          <CopyImageButton targetRef={ref} label="复制图表" />
        </div>
      )}
      {children}
    </div>
  );
}
