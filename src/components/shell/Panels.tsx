"use client";
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { useIsMobile, useReducedMotion } from "@/components/ui/useMedia";
import { NotchTab } from "@/components/shapes";
import { cardEnter } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface Panel { id: string; label: string; className?: string; node: ReactNode }

/** Desktop/tablet: renders all panels in a grid. Mobile: one panel at a time with swipe + segmented notch tabs. */
export function Panels({ panels, className }: { panels: Panel[]; className?: string }) {
  const mobile = useIsMobile();
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const wrap = "min-h-0 min-w-0 flex flex-col h-full";
  if (!mobile) {
    return (
      <div
        style={{ gap: "var(--gutter, 16px)" }}
        className={cn("grid min-h-0 flex-1", className)}
      >
        {panels.map((p, i) => (
          <motion.div
            key={p.id}
            {...cardEnter(i, reduced)}
            className={cn(wrap, p.className)}
          >
            {p.node}
          </motion.div>
        ))}
      </div>
    );
  }
  const cur = panels[Math.min(idx, panels.length - 1)];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto rounded-t-[24px] bg-surface-2 px-3 pt-2">
        {panels.map((p, i) => (
          <NotchTab key={p.id} role="tab" active={i === idx} onClick={() => setIdx(i)}>{p.label}</NotchTab>
        ))}
      </div>
      <motion.div
        key={cur.id}
        className={cn(wrap, "min-h-0 flex-1 rounded-b-[28px] [&>[data-bento-card]]:rounded-t-none")}
        initial={reduced ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
      >
        {cur.node}
      </motion.div>
    </div>
  );
}
