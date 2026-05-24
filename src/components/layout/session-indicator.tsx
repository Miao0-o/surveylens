"use client";

import { useSession } from "@/hooks/use-session";
import { Clock, HardDrive } from "lucide-react";

export function SessionIndicator() {
  const { remainingLabel, hasSavedState, isExpired } = useSession();

  if (!hasSavedState && !isExpired) return null;

  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
      <HardDrive className="w-3 h-3" strokeWidth={1.5} />
      <span>已本地保存</span>
      {remainingLabel && (
        <>
          <span>·</span>
          <Clock className="w-3 h-3" strokeWidth={1.5} />
          <span className={isExpired ? "text-red-400" : ""}>
            {isExpired ? "已过期" : remainingLabel}
          </span>
        </>
      )}
    </div>
  );
}
