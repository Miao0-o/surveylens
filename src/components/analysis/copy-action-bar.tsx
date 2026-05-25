"use client";

import { useState, useCallback, useRef } from "react";
import { Copy, Check, Image } from "lucide-react";
import { toPng } from "html-to-image";

interface CopyAction {
  label: string;
  icon: "text" | "image";
  getContent: () => string | Promise<Blob>;
}

interface Props {
  actions: CopyAction[];
  /** Optional ref to the DOM element to capture as image */
  captureRef?: React.RefObject<HTMLElement | null>;
}

export function CopyActionBar({ actions, captureRef }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = useCallback(async (idx: number, action: CopyAction) => {
    try {
      if (action.icon === "image" && captureRef?.current) {
        const blob = await toPng(captureRef.current, {
          backgroundColor: "#ffffff",
          pixelRatio: 2,
          quality: 0.95,
        });
        const blobResp = await fetch(blob);
        const finalBlob = await blobResp.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": finalBlob }),
        ]);
      } else {
        const content = await action.getContent();
        if (typeof content === "string") {
          await navigator.clipboard.writeText(content);
        }
      }
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      const content = await action.getContent();
      if (typeof content === "string") {
        const ta = document.createElement("textarea");
        ta.value = content;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 1500);
      }
    }
  }, [captureRef]);

  if (actions.length === 0) return null;

  const iconMap = { text: Copy, image: Image };

  return (
    <div className="flex items-center gap-1">
      {actions.map((action, i) => {
        const Icon = iconMap[action.icon];
        const isCopied = copiedIdx === i;
        return (
          <button
            key={i}
            onClick={() => handleCopy(i, action)}
            className={`inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground
              hover:text-foreground hover:border-muted-foreground/30 transition-colors
              ${isCopied ? "text-emerald-600 border-emerald-200 bg-emerald-50" : ""}`}
          >
            {isCopied ? (
              <Check className="w-3 h-3" strokeWidth={2} />
            ) : (
              <Icon className="w-3 h-3" strokeWidth={1.5} />
            )}
            {isCopied ? "已复制" : action.label}
          </button>
        );
      })}
    </div>
  );
}

/** One-click: copy a DOM element as PNG to clipboard */
export function CopyImageButton({ targetRef, label = "复制图片" }: { targetRef: React.RefObject<HTMLElement | null>; label?: string }) {
  return (
    <CopyActionBar
      captureRef={targetRef}
      actions={[{ label, icon: "image", getContent: () => "" }]}
    />
  );
}

