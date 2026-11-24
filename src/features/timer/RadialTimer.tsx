"use client";
import { fmtClock } from "@/lib/utils";

export function RadialTimer({
  pct,
  rem,
  label,
  className,
}: {
  pct: number;
  rem: number;
  label?: string;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const strokeW = 8.5;

  return (
    <div
      className={`relative grid place-items-center aspect-square max-h-full max-w-full mx-auto ${className ?? ""}`}
      style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)" }}
      role="timer"
      aria-label={`${fmtClock(rem)} remaining`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="rgba(11, 11, 12, 0.12)"
          strokeWidth={strokeW}
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--color-teal)"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, pct)))}
          style={{ transition: "stroke-dashoffset .3s linear" }}
        />
      </svg>
      <div className="absolute text-center select-none pointer-events-none">
        <div
          className="font-display num font-extrabold leading-none text-ink"
          style={{ fontSize: "clamp(22px, 20cqmin, 46px)" }}
        >
          {fmtClock(rem)}
        </div>
        {label && (
          <div
            className="mt-1 font-bold uppercase tracking-widest text-muted"
            style={{ fontSize: "clamp(9px, 5.5cqmin, 11px)" }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
