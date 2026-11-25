"use client";
import { fmtClock } from "@/lib/utils";

const TICKS = Array.from({ length: 24 }, (_, i) => i * 15);

export function RadialTimer({
  pct,
  rem,
  label,
  running = false,
  className,
}: {
  pct: number;
  rem: number;
  label?: string;
  running?: boolean;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const strokeW = 8;

  return (
    <div
      className={`pointer-events-none relative grid place-items-center aspect-square max-h-full max-w-full mx-auto transition-all duration-500 ${className ?? ""}`}
      style={{
        width: "min(100cqw, 100cqh)",
        height: "min(100cqw, 100cqh)",
        filter: running ? "drop-shadow(0 0 18px color-mix(in oklch, var(--primary) 55%, transparent))" : undefined,
      }}
      role="timer"
      aria-label={`${fmtClock(rem)} remaining`}
    >
      <svg viewBox="0 0 100 100" className="pointer-events-none size-full -rotate-90">
        {/* Tick marks */}
        <g className="rotate-90 origin-center">
          {TICKS.map((deg) => {
            const cardinal = deg % 90 === 0;
            return (
              <line
                key={deg}
                x1="50"
                y1="3.5"
                x2="50"
                y2={cardinal ? "7.5" : "5.5"}
                stroke={cardinal ? "var(--primary)" : "currentColor"}
                strokeOpacity={cardinal ? 0.85 : 0.35}
                strokeWidth={cardinal ? "1.6" : "0.9"}
                strokeLinecap="round"
                transform={`rotate(${deg} 50 50)`}
              />
            );
          })}
        </g>
        {/* Track: clean neutral ring */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="color-mix(in srgb, var(--ink) 12%, transparent)"
          strokeWidth={strokeW}
        />
        {/* Progress arc: rounded-cap lime */}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, pct)))}
          style={{ transition: "stroke-dashoffset .3s linear" }}
        />
      </svg>
      <div className="absolute text-center select-none pointer-events-none">
        <div
          className="font-display num font-extrabold leading-none text-fg"
          style={{ fontSize: "clamp(28px, 24cqmin, 72px)" }}
        >
          {fmtClock(rem)}
        </div>
        {label && (
          <div
            className="mt-1.5 font-bold uppercase tracking-widest text-muted"
            style={{ fontSize: "clamp(9px, 5.5cqmin, 12px)" }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
