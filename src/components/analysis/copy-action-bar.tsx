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
  captureRef?: React.RefObject<HTMLElement | null>;
}

/** Wrap plain text in clean HTML for Word/Docs paste — no card styling */
function wrapCleanHtml(text: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#fff;color:#111;font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;max-width:700px;margin:20px auto;padding:0">
${text
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/^## (.+)$/gm, '<h2 style="color:#111;margin:16px 0 6px;font-size:14pt;border-bottom:1px solid #e0e0e0;padding-bottom:4px">$1</h2>')
  .replace(/^### (.+)$/gm, '<h3 style="color:#333;margin:12px 0 4px;font-size:12pt">$1</h3>')
  .replace(/^- (.+)$/gm, '<li style="margin:2px 0">$1</li>')
  .replace(/\n\n/g, '</p><p style="margin:6px 0">')
  .replace(/\n/g, '<br>')}
</body>
</html>`;}

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
          try {
            const html = wrapCleanHtml(content);
            const blob = new Blob([html], { type: "text/html" });
            await navigator.clipboard.write([
              new ClipboardItem({ "text/html": blob, "text/plain": new Blob([content], { type: "text/plain" }) }),
            ]);
          } catch {
            // Fallback: plain text only
            await navigator.clipboard.writeText(content);
          }
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

