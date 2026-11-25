"use client";
import { cn } from "@/lib/utils";
import type { DomainTint } from "@/components/ui/design-primitives";

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

const TONE_MAP: Record<Exclude<DomainTint, "ink" | "neutral">, { bg: string; a: string; b: string }> = {
  focus: { bg: "var(--domain-focus-tint)", a: "var(--domain-focus-fill)", b: "var(--domain-stats-fill)" },
  notes: { bg: "var(--domain-notes-tint)", a: "var(--domain-notes-fill)", b: "var(--domain-tools-fill)" },
  quests: { bg: "var(--domain-quests-tint)", a: "var(--domain-quests-fill)", b: "var(--primary)" },
  stats: { bg: "var(--domain-stats-tint)", a: "var(--domain-stats-fill)", b: "var(--primary)" },
  play: { bg: "var(--domain-play-tint)", a: "var(--domain-play-fill)", b: "var(--domain-notes-fill)" },
  tools: { bg: "var(--domain-tools-tint)", a: "var(--domain-tools-fill)", b: "var(--domain-stats-fill)" },
};

export function GenerativeCover({
  seed = "lofi",
  tone = "tools",
  playing = false,
  className,
}: {
  seed?: string;
  tone?: Exclude<DomainTint, "ink" | "neutral">;
  playing?: boolean;
  className?: string;
}) {
  const h = hashStr(seed);
  const c = TONE_MAP[tone];
  const cx1 = 16 + (h % 28);
  const cy1 = 16 + ((h >> 4) % 28);
  const r1 = 14 + ((h >> 8) % 10);
  const cx2 = 34 + ((h >> 12) % 18);
  const cy2 = 34 + ((h >> 16) % 18);

  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-2xl border-[1.5px] border-border-strong shrink-0",
        className
      )}
      style={{ background: c.bg }}
    >
      <svg viewBox="0 0 64 64" className={cn("size-full", playing && "animate-spin [animation-duration:18s]")}>
        <circle cx={cx1} cy={cy1} r={r1} fill={c.a} opacity="0.65" />
        <circle cx={cx2} cy={cy2} r="14" fill={c.b} opacity="0.55" />
        <circle cx="32" cy="32" r="22" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
        <circle cx="32" cy="32" r="5" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="2" />
      </svg>
    </div>
  );
}
