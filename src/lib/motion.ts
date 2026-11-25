"use client";
import { useReducedMotion } from "@/components/ui/useMedia";

export const SPRING_SNAPPY = { type: "spring" as const, stiffness: 500, damping: 30 };
export const SPRING_SOFT = { type: "spring" as const, stiffness: 200, damping: 22 };
export const SPRING_BOUNCY = { type: "spring" as const, stiffness: 350, damping: 12 };
export const INSTANT_TRANSITION = { duration: 0 };

/** Returns springs or instant transitions when prefers-reduced-motion is enabled. */
export function useMotionConfig() {
  const reduced = useReducedMotion();
  return {
    reduced,
    snappy: reduced ? INSTANT_TRANSITION : SPRING_SNAPPY,
    soft: reduced ? INSTANT_TRANSITION : SPRING_SOFT,
    bouncy: reduced ? INSTANT_TRANSITION : SPRING_BOUNCY,
  };
}

/** Staggered card entrance (40ms per item, 12px rise + fade). */
export function cardEnter(index = 0, reduced = false) {
  if (reduced) return {};
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { ...SPRING_SOFT, delay: Math.min(index * 0.04, 0.24) },
  };
}

export const BUTTON_INTERACTION = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.96 },
  transition: SPRING_SNAPPY,
};
