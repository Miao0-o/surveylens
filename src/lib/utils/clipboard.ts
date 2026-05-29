// ============================================================
// Shared clipboard helper — navigator.clipboard + legacy fallback
// ============================================================

/**
 * Copy text to clipboard.
 * Returns true on success, false on failure.
 * Never throws — all errors are caught.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text || text.length === 0) return false;
  console.debug("[copy] start");

  try {
    // Modern API (requires secure context: HTTPS or localhost)
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      console.debug("[copy] success (navigator.clipboard)");
      return true;
    }
  } catch (e) {
    console.debug("[copy] navigator.clipboard failed, trying fallback:", e instanceof Error ? e.message : e);
  }

  // Legacy fallback: textarea + execCommand
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (ok) {
      console.debug("[copy] success (execCommand fallback)");
      return true;
    }
  } catch (e) {
    console.debug("[copy] execCommand failed:", e instanceof Error ? e.message : e);
  }

  console.debug("[copy] failed: all methods exhausted");
  return false;
}

export function getCopySuccessMessage(en: boolean): string {
  return en ? "Copied to clipboard" : "已复制到剪贴板";
}

export function getCopyFailMessage(en: boolean): string {
  return en ? "Copy failed. Please copy manually." : "复制失败，请手动复制。";
}
