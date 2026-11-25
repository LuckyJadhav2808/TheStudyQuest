"use client";
import type { ReactNode } from "react";
import { BentoCard, type BentoCardProps } from "@/components/shell/BentoCard";
import { Segmented } from "@/components/ui/misc";
import { BlobBackdrop } from "@/components/shapes";
import { StrobiFace } from "@/features/strobi/StrobiFace";
import type { Mood } from "@/features/strobi/store";
import { cn } from "@/lib/utils";

export type DomainTint = "focus" | "notes" | "quests" | "stats" | "play" | "tools" | "ink" | "neutral";

const TINT_CLASS: Record<DomainTint, string> = {
  focus: "bg-[#f4ffc4]/65 dark:bg-lime/10",
  notes: "bg-lavender/35",
  quests: "bg-peach/35",
  stats: "bg-teal/12",
  play: "bg-orange/12",
  tools: "bg-[#e3f2ff]/65 dark:bg-strobi/10",
  ink: "!bg-ink !text-paper border-ink",
  neutral: "",
};

const BLOB_COLOR: Record<DomainTint, string> = {
  focus: "var(--color-lime)",
  notes: "var(--color-lavender)",
  quests: "var(--color-peach)",
  stats: "var(--color-teal)",
  play: "var(--color-orange)",
  tools: "var(--color-strobi)",
  ink: "var(--color-violet)",
  neutral: "var(--color-lavender)",
};

/** Stretching page grid: forces rows to fill available viewport height (minmax(0, 1fr)). */
export function PageGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      style={{ gap: "var(--gutter, 16px)" }}
      className={cn("grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)]", className)}
    >
      {children}
    </div>
  );
}

/** HeroCard: domain-tinted BentoCard with optional blob backdrop and 4px hard offset shadow. */
export function HeroCard({
  tint = "notes",
  hardShadow = true,
  withBlob = true,
  className,
  ...rest
}: BentoCardProps & {
  tint?: DomainTint;
  hardShadow?: boolean;
  withBlob?: boolean;
}) {
  return (
    <BentoCard
      blob={
        withBlob && !rest.blob
          ? { preset: 0, color: BLOB_COLOR[tint], className: "-bottom-24 -right-16 size-80 opacity-35" }
          : rest.blob
      }
      className={cn(
        "h-full",
        TINT_CLASS[tint],
        hardShadow && "!shadow-[4px_4px_0_var(--line)]",
        className
      )}
      {...rest}
    />
  );
}

/** StatChip: uppercase 11px label above a large tabular-nums Bricolage figure. */
export function StatChip({
  label,
  value,
  sub,
  size = "md",
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const valCls =
    size === "lg"
      ? "text-4xl sm:text-5xl"
      : size === "sm"
      ? "text-lg sm:text-xl"
      : "text-2xl sm:text-3xl";

  return (
    <div
      className={cn(
        "flex flex-col justify-center rounded-2xl border border-line/30 bg-surface/80 px-3.5 py-2.5",
        className
      )}
    >
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted leading-none">
        {label}
      </span>
      <span className={cn("font-display num mt-1 font-extrabold leading-none text-fg", valCls)}>
        {value}
      </span>
      {sub && <span className="mt-1 text-[11px] text-muted truncate">{sub}</span>}
    </div>
  );
}

/** GhostList: faded placeholder cards at 40% opacity hinting at what will appear. */
export function GhostList({
  count = 3,
  label = "Item",
  className,
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("flex w-full flex-col gap-2 opacity-40 pointer-events-none select-none", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-2xl border border-dashed border-line/50 bg-soft/60 px-3 py-2.5"
        >
          <div className="flex items-center gap-2.5">
            <span className="size-4 rounded-full border border-line/50 bg-surface" />
            <span className="h-2.5 rounded-full bg-fg/20" style={{ width: `${90 + ((i * 37) % 60)}px` }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}

/** EmptyState: vertically centered Strobi mood + witty line + CTA + optional ghost placeholders. */
export function EmptyState({
  title,
  hint,
  action,
  mood = "idle",
  ghostCount = 0,
  ghostLabel,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  mood?: Mood;
  ghostCount?: number;
  ghostLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden p-4 text-center", className)}>
      <BlobBackdrop preset={1} className="size-56 opacity-35 pointer-events-none" />
      <div className="relative z-10 flex max-w-xs flex-col items-center gap-2">
        <StrobiFace mood={mood} size={52} />
        <h3 className="font-display text-lg font-extrabold leading-tight text-fg">{title}</h3>
        {hint && <p className="text-xs text-muted leading-relaxed">{hint}</p>}
        {action && <div className="mt-1">{action}</div>}
      </div>
      {ghostCount > 0 && (
        <div className="relative z-10 w-full max-w-xs">
          <GhostList count={ghostCount} label={ghostLabel} />
        </div>
      )}
    </div>
  );
}

/** ToolTile: icon, label, and 1-line description for tool picker grids. */
export function ToolTile({
  icon,
  label,
  desc,
  active = false,
  onClick,
  color = "#e3f2ff",
}: {
  icon: ReactNode;
  label: string;
  desc: string;
  active?: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-[20px] border-[1.5px] p-3 text-left transition hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer",
        active
          ? "border-ink bg-lime text-ink shadow-[2px_2px_0_var(--line)]"
          : "border-line/40 bg-surface hover:border-ink hover:bg-soft/60"
      )}
    >
      <span
        className="grid size-9 place-items-center rounded-xl border border-ink/40 text-ink shrink-0"
        style={{ background: active ? "#ffffff" : color }}
      >
        {icon}
      </span>
      <span className="font-display text-sm font-extrabold leading-tight">{label}</span>
      <span className="text-[11px] opacity-75 line-clamp-1 leading-tight">{desc}</span>
    </button>
  );
}

export { Segmented as SegmentedPill };
