"use client";

import { useState, useCallback } from "react";
import { Copy, Check, Table, Image } from "lucide-react";

interface CopyAction {
  label: string;
  icon: "text" | "table" | "image";
  getContent: () => string | Promise<Blob>;
}

interface Props {
  actions: CopyAction[];
  size?: "sm" | "md";
}

export function CopyActionBar({ actions, size = "sm" }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = useCallback(async (idx: number, action: CopyAction) => {
    try {
      const content = await action.getContent();
      if (typeof content === "string") {
        await navigator.clipboard.writeText(content);
      } else {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": content }),
        ]);
      }
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      // Fallback: select text
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
  }, []);

  if (actions.length === 0) return null;

  const iconMap = {
    text: Copy,
    table: Table,
    image: Image,
  };

  return (
    <div className={`flex items-center gap-1 ${size === "md" ? "mt-3" : ""}`}>
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

/** Convenience: text-only copy button */
export function CopyTextButton({ text, label = "复制" }: { text: string; label?: string }) {
  return (
    <CopyActionBar
      actions={[{ label, icon: "text", getContent: () => text }]}
    />
  );
}
