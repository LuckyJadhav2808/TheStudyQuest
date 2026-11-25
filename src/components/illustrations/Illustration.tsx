"use client";
import { cn } from "@/lib/utils";
import type { DomainTint } from "@/components/ui/design-primitives";

export type IllustrationName =
  | "desk"
  | "calendar"
  | "horizon"
  | "clipboard"
  | "hammer"
  | "trophy"
  | "open-book"
  | "character-sheet"
  | "palette"
  | "sparkles-ai"
  | "vault"
  | "chest"
  | "rank-badge";

const TONE_VARS: Record<Exclude<DomainTint, "ink" | "neutral">, { tint: string; accent: string }> = {
  focus: { tint: "var(--domain-focus-tint)", accent: "var(--domain-focus-fill)" },
  notes: { tint: "var(--domain-notes-tint)", accent: "var(--domain-notes-fill)" },
  quests: { tint: "var(--domain-quests-tint)", accent: "var(--domain-quests-fill)" },
  stats: { tint: "var(--domain-stats-tint)", accent: "var(--domain-stats-fill)" },
  play: { tint: "var(--domain-play-tint)", accent: "var(--domain-play-fill)" },
  tools: { tint: "var(--domain-tools-tint)", accent: "var(--domain-tools-fill)" },
};

const STROKE = "var(--border-strong)";

export function Illustration({
  name,
  tone = "focus",
  rank = 0,
  className,
  decorative = true,
}: {
  name: IllustrationName;
  tone?: Exclude<DomainTint, "ink" | "neutral">;
  rank?: number;
  className?: string;
  decorative?: boolean;
}) {
  const { tint, accent } = TONE_VARS[tone];
  const common = {
    viewBox: "0 0 120 96",
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": decorative ? true : undefined,
    className: cn("shrink-0 select-none pointer-events-none", className),
  };

  if (name === "desk") {
    return (
      <svg {...common}>
        <line x1="12" y1="78" x2="108" y2="78" stroke={STROKE} strokeWidth="2" />
        {/* Desk lamp */}
        <path d="M26 78 L34 48 L48 34" stroke={STROKE} strokeWidth="2" />
        <path d="M44 30 L58 38 L50 46 Z" fill={accent} stroke={STROKE} strokeWidth="2" />
        <rect x="20" y="73" width="14" height="5" rx="2.5" fill={tint} stroke={STROKE} strokeWidth="2" />
        {/* Stack of books */}
        <rect x="64" y="66" width="32" height="12" rx="3" fill={tint} stroke={STROKE} strokeWidth="2" />
        <rect x="68" y="56" width="24" height="10" rx="3" fill={accent} stroke={STROKE} strokeWidth="2" />
        {/* Plant */}
        <path d="M98 78 L95 62 H107 L104 78 Z" fill={tint} stroke={STROKE} strokeWidth="2" />
        <path d="M101 62 C95 52, 92 46, 98 44 C103 42, 102 54, 101 62 Z" fill={accent} stroke={STROKE} strokeWidth="2" />
        <path d="M101 62 C108 54, 112 48, 106 46 C102 44, 101 54, 101 62 Z" fill={accent} stroke={STROKE} strokeWidth="2" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common} viewBox="0 0 80 72">
        <rect x="12" y="16" width="56" height="44" rx="10" fill={tint} stroke={STROKE} strokeWidth="2" />
        <path d="M12 28 H68" stroke={STROKE} strokeWidth="2" />
        <line x1="26" y1="10" x2="26" y2="20" stroke={STROKE} strokeWidth="2" />
        <line x1="54" y1="10" x2="54" y2="20" stroke={STROKE} strokeWidth="2" />
        <circle cx="30" cy="40" r="4" fill={accent} stroke={STROKE} strokeWidth="1.5" />
        <circle cx="44" cy="40" r="4" fill="var(--surface)" stroke={STROKE} strokeWidth="1.5" />
        <circle cx="56" cy="40" r="4" fill="var(--surface)" stroke={STROKE} strokeWidth="1.5" />
      </svg>
    );
  }

  if (name === "horizon") {
    return (
      <svg {...common} viewBox="0 0 320 140" preserveAspectRatio="none">
        <path d="M0 110 Q 80 72, 160 98 T 320 88 L320 140 L0 140 Z" fill={accent} opacity="0.22" />
        <path d="M0 124 Q 95 96, 190 118 T 320 108 L320 140 L0 140 Z" fill={tint} opacity="0.55" />
        <circle cx="268" cy="36" r="18" fill={accent} opacity="0.28" />
      </svg>
    );
  }

  if (name === "clipboard") {
    return (
      <svg {...common} viewBox="0 0 96 88">
        <rect x="22" y="16" width="52" height="60" rx="10" fill={tint} stroke={STROKE} strokeWidth="2" />
        <rect x="36" y="10" width="24" height="12" rx="5" fill={accent} stroke={STROKE} strokeWidth="2" />
        <line x1="34" y1="36" x2="62" y2="36" stroke={STROKE} strokeWidth="2" />
        <line x1="34" y1="48" x2="58" y2="48" stroke={STROKE} strokeWidth="2" />
        <line x1="34" y1="60" x2="50" y2="60" stroke={STROKE} strokeWidth="2" />
      </svg>
    );
  }

  if (name === "hammer") {
    return (
      <svg {...common} viewBox="0 0 96 88">
        <rect x="26" y="22" width="38" height="18" rx="6" fill={accent} stroke={STROKE} strokeWidth="2" transform="rotate(-24 45 31)" />
        <rect x="44" y="34" width="10" height="40" rx="5" fill={tint} stroke={STROKE} strokeWidth="2" transform="rotate(-24 49 54)" />
        <circle cx="72" cy="24" r="4" fill={accent} stroke={STROKE} strokeWidth="1.5" />
      </svg>
    );
  }

  if (name === "trophy") {
    return (
      <svg {...common} viewBox="0 0 96 88">
        <path d="M30 20 H66 V40 C66 52, 58 58, 48 58 C38 58, 30 52, 30 40 Z" fill={accent} stroke={STROKE} strokeWidth="2" />
        <path d="M30 26 H20 C18 36, 22 42, 30 42" stroke={STROKE} strokeWidth="2" />
        <path d="M66 26 H76 C78 36, 74 42, 66 42" stroke={STROKE} strokeWidth="2" />
        <line x1="48" y1="58" x2="48" y2="70" stroke={STROKE} strokeWidth="2" />
        <rect x="34" y="70" width="28" height="8" rx="4" fill={tint} stroke={STROKE} strokeWidth="2" />
      </svg>
    );
  }

  if (name === "open-book") {
    return (
      <svg {...common} viewBox="0 0 112 84">
        <path d="M16 20 C32 16, 46 20, 56 26 C66 20, 80 16, 96 20 V66 C80 62, 66 66, 56 72 C46 66, 32 62, 16 66 Z" fill={tint} stroke={STROKE} strokeWidth="2" />
        <line x1="56" y1="26" x2="56" y2="72" stroke={STROKE} strokeWidth="2" />
        <line x1="26" y1="34" x2="46" y2="34" stroke={STROKE} strokeWidth="2" />
        <line x1="26" y1="44" x2="44" y2="44" stroke={STROKE} strokeWidth="2" />
        <line x1="66" y1="34" x2="86" y2="34" stroke={STROKE} strokeWidth="2" />
        <line x1="66" y1="44" x2="82" y2="44" stroke={STROKE} strokeWidth="2" />
        <circle cx="84" cy="18" r="5" fill={accent} stroke={STROKE} strokeWidth="1.5" />
      </svg>
    );
  }

  if (name === "character-sheet") {
    return (
      <svg {...common} viewBox="0 0 120 84">
        <rect x="14" y="14" width="92" height="58" rx="12" fill={tint} stroke={STROKE} strokeWidth="2" />
        <rect x="24" y="24" width="26" height="32" rx="8" fill={accent} stroke={STROKE} strokeWidth="2" />
        <circle cx="37" cy="36" r="6" fill="var(--surface)" stroke={STROKE} strokeWidth="1.5" />
        <line x1="60" y1="28" x2="94" y2="28" stroke={STROKE} strokeWidth="2" />
        <line x1="60" y1="39" x2="86" y2="39" stroke={STROKE} strokeWidth="2" />
        <rect x="60" y="48" width="34" height="8" rx="4" fill="var(--surface)" stroke={STROKE} strokeWidth="1.5" />
      </svg>
    );
  }

  if (name === "palette") {
    return (
      <svg {...common} viewBox="0 0 80 68">
        <path d="M40 12 C22 12, 12 24, 12 38 C12 50, 22 56, 32 56 C36 56, 38 52, 36 48 C34 44, 38 40, 44 40 C56 40, 68 34, 68 24 C68 16, 54 12, 40 12 Z" fill={tint} stroke={STROKE} strokeWidth="2" />
        <circle cx="28" cy="28" r="4" fill={accent} stroke={STROKE} strokeWidth="1.5" />
        <circle cx="42" cy="24" r="4" fill="var(--domain-quests-fill)" stroke={STROKE} strokeWidth="1.5" />
        <circle cx="54" cy="28" r="4" fill="var(--domain-stats-fill)" stroke={STROKE} strokeWidth="1.5" />
      </svg>
    );
  }

  if (name === "sparkles-ai") {
    return (
      <svg {...common} viewBox="0 0 80 68">
        <path d="M36 12 L42 28 L58 34 L42 40 L36 56 L30 40 L14 34 L30 28 Z" fill={accent} stroke={STROKE} strokeWidth="2" />
        <path d="M62 12 L64 18 L70 20 L64 22 L62 28 L60 22 L54 20 L60 18 Z" fill={tint} stroke={STROKE} strokeWidth="1.5" />
      </svg>
    );
  }

  if (name === "vault") {
    return (
      <svg {...common} viewBox="0 0 80 68">
        <rect x="16" y="14" width="48" height="40" rx="10" fill={tint} stroke={STROKE} strokeWidth="2" />
        <circle cx="40" cy="34" r="10" fill={accent} stroke={STROKE} strokeWidth="2" />
        <circle cx="40" cy="34" r="3" fill="var(--surface)" stroke={STROKE} strokeWidth="1.5" />
      </svg>
    );
  }

  if (name === "chest") {
    return (
      <svg {...common} viewBox="0 0 88 76">
        <rect x="16" y="28" width="56" height="34" rx="8" fill={tint} stroke={STROKE} strokeWidth="2" />
        <path d="M16 34 C16 20, 72 20, 72 34 Z" fill={accent} stroke={STROKE} strokeWidth="2" />
        <rect x="38" y="34" width="12" height="12" rx="3" fill="var(--surface)" stroke={STROKE} strokeWidth="2" />
      </svg>
    );
  }

  // rank-badge
  return (
    <svg {...common} viewBox="0 0 64 64">
      <polygon points="32,6 54,18 54,44 32,58 10,44 10,18" fill={tint} stroke={STROKE} strokeWidth="2" />
      <polygon points="32,14 46,22 46,40 32,48 18,40 18,22" fill={accent} stroke={STROKE} strokeWidth="2" />
      {rank >= 3 && <path d="M24 22 L32 14 L40 22" stroke={STROKE} strokeWidth="2" />}
      <circle cx="32" cy="31" r="5" fill="var(--surface)" stroke={STROKE} strokeWidth="1.5" />
    </svg>
  );
}
