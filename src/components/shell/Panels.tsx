"use client";
import { AnimatePresence, motion } from "motion/react";
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
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={cur.id}
          className={cn(wrap, "min-h-0 flex-1 rounded-b-[28px] [&>[data-bento-card]]:rounded-t-none")}
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
          drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2}
          onDragEnd={(_, i) => { if (i.offset.x < -70) setIdx((v) => Math.min(panels.length - 1, v + 1)); else if (i.offset.x > 70) setIdx((v) => Math.max(0, v - 1)); }}
        >
          {cur.node}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
