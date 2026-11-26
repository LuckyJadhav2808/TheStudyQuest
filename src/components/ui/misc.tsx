"use client";
import { animate, motion } from "motion/react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BlobBackdrop } from "@/components/shapes";
import { StrobiFace, type StrobiPose } from "@/features/strobi/StrobiFace";
import { useMotionConfig } from "@/lib/motion";

import { useUI } from "@/components/shell/ui-store";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = animate(prev.current, value, { duration: reduce ? 0 : 0.6, ease: "easeOut", onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString(); } });
    prev.current = value;
    return () => c.stop();
  }, [value]);
  return <span ref={ref} className={cn("num", className)}>{value.toLocaleString()}</span>;
}
export function ProgressBar({
  pct,
  className,
  color = "var(--domain-stats-fill)",
  variant = "solid",
}: {
  pct: number;
  className?: string;
  color?: string;
  variant?: "solid" | "hatched";
}) {
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} className={cn("h-3 overflow-hidden rounded-full border border-border-strong/50 bg-surface-2", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", variant === "hatched" && "progress-hatched")}
        style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%`, backgroundColor: color }}
      />
    </div>
  );
}

/** Segmented semi-circular tick gauge inspired by mechanical telemetry dials. */
export function TickGauge({
  pct,
  ticks = 20,
  color = "var(--domain-stats-fill)",
  label,
  className,
}: {
  pct: number;
  ticks?: number;
  color?: string;
  label?: string;
  className?: string;
}) {
  const clamped = Math.min(1, Math.max(0, pct));
  const activeCount = Math.round(clamped * ticks);
  return (
    <div className={cn("relative inline-flex flex-col items-center justify-end", className)} role="img" aria-label={label ?? `${Math.round(clamped * 100)}%`}>
      <svg viewBox="0 0 120 68" className="w-full h-auto overflow-visible">
        {Array.from({ length: ticks }, (_, i) => {
          const angle = -180 + (i / (ticks - 1)) * 180;
          const rad = (angle * Math.PI) / 180;
          const r1 = 44;
          const r2 = 54;
          const x1 = Number((60 + r1 * Math.cos(rad)).toFixed(2));
          const y1 = Number((60 + r1 * Math.sin(rad)).toFixed(2));
          const x2 = Number((60 + r2 * Math.cos(rad)).toFixed(2));
          const y2 = Number((60 + r2 * Math.sin(rad)).toFixed(2));
          const on = i < activeCount;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={on ? color : "color-mix(in srgb, var(--fg) 20%, transparent)"}
              strokeWidth={on ? 3.4 : 2.6}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute bottom-0 text-center leading-none">
        <span className="font-display num text-lg font-extrabold text-fg">{Math.round(clamped * 100)}%</span>
        {label && <span className="block text-[9px] font-bold uppercase tracking-wider text-muted mt-0.5">{label}</span>}
      </div>
    </div>
  );
}
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; className?: string }[];
  size?: "md" | "xs";
  ariaLabel?: string;
  className?: string;
}) {
  const id = useId();
  const { snappy } = useMotionConfig();
  const xs = size === "xs";
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "no-scrollbar inline-flex max-w-full overflow-x-auto rounded-full",
        xs ? "border border-line bg-surface p-0.5" : "border-[1.5px] border-border-strong bg-surface-2 p-1",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative shrink-0 whitespace-nowrap rounded-full transition-colors cursor-pointer",
              xs ? "px-2 py-0.5 text-[10px] font-extrabold" : "min-h-9 px-3.5 text-[13px] font-bold",
              active ? "text-on-inverse" : "text-ink-muted hover:text-fg",
              o.className
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={snappy}
                className="absolute inset-0 rounded-full bg-surface-inverse"
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border border-border-strong/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-on-primary", className)} style={{ background: color ?? "var(--primary)" }}>{children}</span>;
}
export function IconBadge({ children, color = "var(--primary)", className }: { children: ReactNode; color?: string; className?: string }) {
  return <span className={cn("grid size-11 shrink-0 place-items-center rounded-[16px] border-[1.5px] border-border-strong text-on-primary", className)} style={{ background: color }}>{children}</span>;
}
export function Empty({ title, hint, action, mood = "idle" }: { title: string; hint?: string; action?: ReactNode; mood?: StrobiPose }) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[20px] p-3 text-center">
      <BlobBackdrop preset={1} className="size-48 opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-1.5 max-w-xs">
        <StrobiFace mood={mood} size={44} />
        <p className="card-title text-sm sm:text-base leading-tight">{title}</p>
        {hint && <p className="text-xs text-muted leading-tight line-clamp-2">{hint}</p>}
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}
export function CardTitle({ children, right, sub }: { children: ReactNode; right?: ReactNode; sub?: string }) {
  return (
    <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
      <div className="min-w-0"><h2 className="card-title truncate">{children}</h2>{sub && <p className="mt-1 truncate text-xs text-muted">{sub}</p>}</div>
      {right}
    </div>
  );
}
export function Card({ children, className, lift = true, ...rest }: { children: ReactNode; className?: string; lift?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bento-card flex flex-col", lift && "lift", className)} {...rest}>{children}</div>;
}
export function PageFrame({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const set = useUI((s) => s.set);
  useEffect(() => {
    if (title || subtitle || actions) {
      set({ pageHeader: { title, subtitle, actions } });
    }
    return () => set({ pageHeader: null });
  }, [title, subtitle, actions, set]);

  return (
    <section style={{ padding: "var(--gutter, 16px)" }} className={cn("flex h-full min-h-0 flex-col", className)}>
      {actions && (
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:hidden">
          {actions}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
