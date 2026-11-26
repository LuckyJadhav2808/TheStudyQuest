"use client";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

const BLOBS = [
  "M44.7,-61.4C58.1,-52.9,69.2,-39.8,73.6,-24.9C78,-10,75.7,6.7,69.4,21.1C63.1,35.5,52.8,47.6,40.1,56.6C27.4,65.6,12.3,71.5,-3.2,75.4C-18.6,79.3,-34.5,81.2,-47.4,74.2C-60.3,67.2,-70.3,51.3,-74.6,34.6C-78.9,17.9,-77.5,0.4,-72.4,-14.6C-67.3,-29.6,-58.4,-42.1,-46.8,-51.1C-35.2,-60.1,-17.6,-65.6,-1.1,-64.2C15.4,-62.8,31.3,-69.9,44.7,-61.4Z",
  "M39.9,-52.6C51.2,-45.1,59.4,-32.5,63.7,-18.4C68,-4.3,68.4,11.3,62.1,23.6C55.8,35.9,42.8,44.9,29.4,52.1C16,59.3,2.2,64.7,-12.2,63.7C-26.6,62.7,-41.6,55.3,-52.7,43.6C-63.8,31.9,-71,15.9,-70.6,0.2C-70.2,-15.5,-62.2,-31,-50.7,-38.6C-39.2,-46.2,-24.1,-45.9,-9.5,-50C5.1,-54.1,28.6,-60.1,39.9,-52.6Z",
  "M33.2,-45.3C43.4,-37.4,52.4,-28.4,58.2,-16.6C64,-4.8,66.6,9.7,61.5,21C56.4,32.3,43.6,40.4,30.9,47.8C18.2,55.2,5.6,61.9,-8.7,63.4C-23,64.9,-39.1,61.2,-50.1,51.2C-61.1,41.2,-67,24.9,-67.7,8.7C-68.4,-7.5,-63.9,-23.6,-54.1,-35.2C-44.3,-46.8,-29.2,-53.9,-14.5,-57.4C0.2,-60.9,22.9,-53.2,33.2,-45.3Z",
];
export function BlobBackdrop({ preset = 0, color = "var(--color-lavender)", className, animate = true }: { preset?: 0 | 1 | 2; color?: string; className?: string; animate?: boolean }) {
  return (
    <svg aria-hidden viewBox="-100 -100 200 200" className={cn("pointer-events-none absolute -z-0 opacity-70", className)}>
      <path d={BLOBS[preset]} fill={color} className={animate ? "animate-blob" : undefined} />
    </svg>
  );
}

const fillet = (side: "l" | "r", bg: string): CSSStyleProperty => ({ background: `radial-gradient(circle at ${side === "l" ? "0 0" : "100% 0"}, transparent 19.5px, ${bg} 20px)` });
type CSSStyleProperty = CSSProperties;

/** Concave curved tab: the active tab merges into the surface below it. */
export function NotchTab({ active, bg = "var(--surface)", children, className, ...rest }: { active?: boolean; bg?: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn("relative shrink-0 whitespace-nowrap min-h-11 rounded-t-[20px] px-4 text-[13px] font-bold transition-colors", active ? "text-fg" : "text-paper/80 hover:text-paper", className)}
      style={active ? { background: bg } : undefined}
      {...rest}
    >
      {active && (
        <>
          <span aria-hidden className="inv-corner" style={{ right: "100%", bottom: 0, ...fillet("l", bg) }} />
          <span aria-hidden className="inv-corner" style={{ left: "100%", bottom: 0, ...fillet("r", bg) }} />
        </>
      )}
      <span className="relative" style={active ? { color: "var(--fg)" } : undefined}>{children}</span>
    </button>
  );
}

/** Lime cut-out corner with a slot for an action (usually an arrow button). */
export function CurvedCorner({ children, className, tone = "lime" }: { children?: ReactNode; className?: string; tone?: "lime" | "orange" }) {
  const c = tone === "lime" ? "var(--color-lime)" : "var(--color-orange)";
  const f = (pos: string): CSSProperties => ({ background: `radial-gradient(circle at 0 100%, transparent 19.5px, ${c} 20px)`, ...(pos === "left" ? { right: "100%", top: 0 } : { right: 0, top: "100%" }) });
  return (
    <div className={cn("absolute right-0 top-0 grid size-16 place-items-center rounded-bl-[28px] rounded-tr-[32px] text-ink", className)} style={{ background: c, margin: "-1.5px" }}>
      <span aria-hidden className="inv-corner" style={f("left")} />
      <span aria-hidden className="inv-corner" style={f("below")} />
      {children}
    </div>
  );
}

export function StickerCard({ children, className, tilt = -3 }: { children: ReactNode; className?: string; tilt?: number }) {
  return (
    <div
      className={cn("rounded-[28px] border-[1.5px] border-ink bg-orange p-4 text-ink shadow-[0_10px_30px_-12px_rgba(0,0,0,.35)] transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] hover:!rotate-0 motion-reduce:!rotate-0", className)}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {children}
    </div>
  );
}

/** Gentle SVG wavy divider between card header and body. */
export function WavyDivider({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 12"
      preserveAspectRatio="none"
      className={cn("h-2.5 w-full shrink-0 text-line/15", className)}
    >
      <path
        d="M0 6 Q 25 1, 50 6 T 100 6 T 150 6 T 200 6 T 250 6 T 300 6 T 350 6 T 400 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function DashedAddTile({ label, onClick, className }: { label: string; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("grid min-h-11 w-full place-items-center rounded-[24px] border-2 border-dashed border-current/40 p-3 text-sm font-bold text-muted transition hover:border-current hover:text-fg", className)}>
      <span className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-lime text-lg leading-none text-ink">+</span>{label}</span>
    </button>
  );
}
