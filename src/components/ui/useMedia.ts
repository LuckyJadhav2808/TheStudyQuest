"use client";
import { useSyncExternalStore } from "react";

export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
export const useIsMobile = () => useMedia("(max-width: 639px)");
export const useIsDesktop = () => useMedia("(min-width: 1024px)");
export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");
