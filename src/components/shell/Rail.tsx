"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { GROUPS, groupForPath } from "./nav";
import { useUI } from "./ui-store";
import { cn } from "@/lib/utils";
import { StrobiRailButton } from "@/features/strobi/StrobiDock";
import { tasksRepo } from "@/core/repos";
import { useRows } from "@/features/shared/hooks";
import { useMotionConfig } from "@/lib/motion";

export function Rail() {
  const path = usePathname();
  const active = groupForPath(path);
  const { launcher, set: setUI } = useUI();
  const tasks = useRows(tasksRepo) ?? [];
  const hasDueTasks = tasks.some((t) => t.status !== "done");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { snappy } = useMotionConfig();

  const mainGroups = GROUPS.filter((g) => g.id !== "settings");
  const settingsGroup = GROUPS.find((g) => g.id === "settings");

  const renderItem = (g: (typeof GROUPS)[number], idx: number) => {
    const Icon = g.icon;
    const on = g.id === active;
    const isOpen = launcher === g.id;
    const showDot = g.id === "plan" && hasDueTasks;

    // Dock-style magnetic falloff on hover
    const dist = hoveredIdx === null ? 99 : Math.abs(hoveredIdx - idx);
    const magX = dist === 0 ? 3.5 : dist === 1 ? 1.5 : 0;
    const magScale = dist === 0 ? 1.1 : dist === 1 ? 1.03 : 1;

    const cls = cn(
      "group relative grid place-items-center rounded-full shrink-0 cursor-pointer",
      on ? "text-[var(--rail-notch-ink,var(--fg))]" : isOpen ? "bg-white/15 text-on-inverse" : "text-on-inverse/75 hover:text-on-inverse"
    );
    const sizeStyle = { width: "clamp(36px, 5.5vh, 48px)", height: "clamp(36px, 5.5vh, 48px)" };

    // Ink pill tooltip with speech tail
    const tip = (
      <span
        role="tooltip"
        className="pointer-events-none absolute left-[calc(100%+16px)] z-50 flex items-center whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-paper opacity-0 shadow-lg -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0"
      >
        <span aria-hidden className="absolute -left-1 size-2.5 rotate-45 bg-ink" />
        <span className="relative z-10">{g.label}</span>
      </span>
    );

    // Sliding concave notch extending right into page canvas
    const activeNotch = on ? (
      <motion.span
        layoutId="rail-active-notch"
        transition={snappy}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 -right-3 rounded-l-full"
        style={{ backgroundColor: "var(--rail-notch, var(--canvas))" }}
      >
        <span
          className="pointer-events-none absolute -top-3 right-0 size-3"
          style={{ backgroundImage: "radial-gradient(circle at 0 0, transparent 11.5px, var(--rail-notch, var(--canvas)) 12px)" }}
        />
        <span
          className="pointer-events-none absolute -bottom-3 right-0 size-3"
          style={{ backgroundImage: "radial-gradient(circle at 0 100%, transparent 11.5px, var(--rail-notch, var(--canvas)) 12px)" }}
        />
      </motion.span>
    ) : null;

    const dot = showDot ? (
      <span
        aria-hidden
        className="absolute right-1 top-1 z-20 size-2 rounded-full bg-lime ring-2 ring-ink animate-pulse"
      />
    ) : null;

    const content = (
      <>
        {activeNotch}
        <motion.span
          animate={{ x: magX, scale: magScale }}
          transition={snappy}
          className="relative z-10 grid place-items-center"
        >
          <Icon size={22} weight={on || isOpen ? "fill" : "duotone"} />
        </motion.span>
        {dot}
        {tip}
      </>
    );

    const events = {
      onMouseEnter: () => setHoveredIdx(idx),
      onMouseLeave: () => setHoveredIdx(null),
    };

    return g.href ? (
      <Link
        key={g.id}
        href={g.href}
        onClick={() => setUI({ launcher: null })}
        aria-label={g.label}
        aria-current={on ? "page" : undefined}
        style={sizeStyle}
        className={cls}
        {...events}
      >
        {content}
      </Link>
    ) : (
      <button
        key={g.id}
        type="button"
        aria-label={`${g.label} pages`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setUI({ launcher: isOpen ? null : g.id })}
        style={sizeStyle}
        className={cls}
        {...events}
      >
        {content}
      </button>
    );
  };

  return (
    <nav aria-label="Primary" className="relative z-[70] hidden w-[84px] shrink-0 p-3 pr-0 sm:block sm:py-4 sm:pl-4">
      <div className="flex h-full w-[68px] flex-col items-center justify-between rounded-full bg-surface-inverse px-2 py-3 shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)] border border-line">
        {/* Top: Strobi docked at top of rail */}
        <div className="shrink-0">
          <StrobiRailButton />
        </div>

        {/* Middle: Main navigation items */}
        <div
          style={{ gap: "clamp(4px, 1vh, 12px)" }}
          className="no-scrollbar flex flex-col items-center justify-center w-full"
        >
          {mainGroups.map((g, i) => renderItem(g, i))}
        </div>

        {/* Bottom: Settings */}
        <div className="shrink-0">
          {settingsGroup && renderItem(settingsGroup, mainGroups.length)}
        </div>
      </div>
    </nav>
  );
}
