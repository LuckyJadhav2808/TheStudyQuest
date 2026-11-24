"use client";
import { fmtClock } from "@/lib/utils";

export function RadialTimer({ pct, rem, label, size = 260, stroke = 16 }: { pct: number; rem: number; label?: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="timer" aria-label={`${fmtClock(rem)} remaining`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--soft)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-teal)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, pct)))} style={{ transition: "stroke-dashoffset .3s linear" }} />
      </svg>
      <div className="absolute text-center">
        <div className="font-display num leading-none" style={{ fontSize: size * 0.22 }}>{fmtClock(rem)}</div>
        {label && <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted">{label}</div>}
      </div>
    </div>
  );
}
