"use client";
import { cn } from "@/lib/utils";

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PALETTES = [
  { bg: "var(--domain-focus-tint)", fg: "var(--domain-focus-fill)" },
  { bg: "var(--domain-notes-tint)", fg: "var(--domain-notes-fill)" },
  { bg: "var(--domain-quests-tint)", fg: "var(--domain-quests-fill)" },
  { bg: "var(--domain-stats-tint)", fg: "var(--domain-stats-fill)" },
  { bg: "var(--domain-play-tint)", fg: "var(--domain-play-fill)" },
  { bg: "var(--domain-tools-tint)", fg: "var(--domain-tools-fill)" },
];

export function SeededAvatar({
  seed = "strobi",
  size = 32,
  className,
}: {
  seed?: string;
  size?: number;
  className?: string;
}) {
  const h = hashSeed(seed || "strobi");
  const pal = PALETTES[h % PALETTES.length];
  const eyeStyle = (h >> 3) % 3;
  const cheek = ((h >> 5) & 1) === 1;
  const hat = (h >> 6) % 4; // 0: none, 1: sprout, 2: beanie, 3: antenna

  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-full border-[1.5px] border-border-strong", className)}
      style={{ width: size, height: size, background: pal.bg }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="size-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Head/torso blob */}
        <circle cx="20" cy="23" r="12" fill={pal.fg} stroke="var(--border-strong)" strokeWidth="2" />
        {/* Hat / Top */}
        {hat === 1 && (
          <>
            <path d="M20 11 V6" stroke="var(--border-strong)" strokeWidth="2" />
            <circle cx="22" cy="5" r="2.5" fill="var(--primary)" stroke="var(--border-strong)" strokeWidth="1.5" />
          </>
        )}
        {hat === 2 && (
          <path d="M10 17 C12 10, 28 10, 30 17 Z" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.8" />
        )}
        {hat === 3 && (
          <>
            <line x1="20" y1="11" x2="20" y2="5" stroke="var(--border-strong)" strokeWidth="1.8" />
            <circle cx="20" cy="5" r="2" fill="var(--primary)" stroke="var(--border-strong)" strokeWidth="1.4" />
          </>
        )}
        {/* Eyes */}
        {eyeStyle === 0 && (
          <>
            <circle cx="16" cy="22" r="1.7" fill="var(--border-strong)" />
            <circle cx="24" cy="22" r="1.7" fill="var(--border-strong)" />
          </>
        )}
        {eyeStyle === 1 && (
          <>
            <path d="M14 22 Q16 20 18 22" stroke="var(--border-strong)" strokeWidth="2" />
            <path d="M22 22 Q24 20 26 22" stroke="var(--border-strong)" strokeWidth="2" />
          </>
        )}
        {eyeStyle === 2 && (
          <>
            <rect x="13.5" y="19.5" width="5" height="4.5" rx="1.5" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.4" />
            <rect x="21.5" y="19.5" width="5" height="4.5" rx="1.5" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.4" />
            <line x1="18.5" y1="21.5" x2="21.5" y2="21.5" stroke="var(--border-strong)" strokeWidth="1.4" />
          </>
        )}
        {/* Mouth */}
        <path d="M17.5 26.5 Q20 28.5 22.5 26.5" stroke="var(--border-strong)" strokeWidth="1.8" />
        {cheek && (
          <>
            <circle cx="13" cy="25.5" r="1.5" fill="var(--surface)" opacity="0.55" />
            <circle cx="27" cy="25.5" r="1.5" fill="var(--surface)" opacity="0.55" />
          </>
        )}
      </svg>
    </span>
  );
}
