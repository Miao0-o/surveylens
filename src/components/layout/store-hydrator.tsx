"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function StoreHydrator({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useAppStore.getState().hydrate();
  }, []);

  return <>{children}</>;
}
