"use client";
import { animate } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BlobBackdrop } from "@/components/shapes";
import { StrobiFace } from "@/features/strobi/StrobiFace";
import type { Mood } from "@/features/strobi/store";

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
export function ProgressBar({ pct, className, color = "var(--color-teal)" }: { pct: number; className?: string; color?: string }) {
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} className={cn("h-3 overflow-hidden rounded-full border border-line/60 bg-soft", className)}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%`, background: color }} />
    </div>
  );
}
export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-full border-[1.5px] border-line bg-soft p-1", className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)} className={cn("min-h-9 rounded-full px-3.5 text-[13px] font-bold transition", o.value === value ? "bg-ink text-paper" : "text-muted hover:text-fg")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border border-ink/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink", className)} style={{ background: color ?? "var(--color-lime)" }}>{children}</span>;
}
export function IconBadge({ children, color = "var(--color-lime)", className }: { children: ReactNode; color?: string; className?: string }) {
  return <span className={cn("grid size-11 shrink-0 place-items-center rounded-[16px] border-[1.5px] border-ink text-ink", className)} style={{ background: color }}>{children}</span>;
}
export function Empty({ title, hint, action, mood = "idle" }: { title: string; hint?: string; action?: ReactNode; mood?: Mood }) {
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
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
