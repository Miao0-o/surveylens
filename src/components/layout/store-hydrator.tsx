"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function StoreHydrator({ children }: { children: React.ReactNode }) {
  // Persistence temporarily disabled for debugging
  // useEffect(() => {
  //   useAppStore.getState().hydrate();
  // }, []);

  return <>{children}</>;
}
