"use client";
import { useId } from "react";
import type { Mood } from "./store";

export type StrobiPose =
  | Mood
  | "cheering"
  | "worried"
  | "reading"
  | "headphones"
  | "sparkle"
  | "sad-no-streak";

/** 2D Strobi: used for fallback, toasts, empty states, 404, login, and pose props. */
export function StrobiFace({
  mood = "idle",
  size = 48,
  level = 0,
  className,
}: {
  mood?: StrobiPose;
  size?: number;
  level?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const eye = (cx: number, rot: number) => {
    switch (mood) {
      case "happy":
      case "cheer":
      case "cheering":
      case "celebrate":
      case "sparkle":
        return <path d={`M${cx - 7} 54 Q${cx} 42 ${cx + 7} 54`} stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" transform={`rotate(${rot} ${cx} 50)`} />;
      case "sleepy":
        return <rect x={cx - 8} y={52} width="16" height="5" rx="2.5" fill="#fff" transform={`rotate(${rot} ${cx} 54)`} />;
      case "alert":
      case "worried":
        return <rect x={cx - 6} y={34} width="12" height="36" rx="6" fill="#fff" />;
      case "sad-no-streak":
        return <path d={`M${cx - 7} 48 Q${cx} 57 ${cx + 7} 48`} stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" />;
      case "thinking":
      case "reading":
        return <rect x={cx - 6} y={cx > 60 ? 36 : 42} width="12" height={cx > 60 ? 32 : 22} rx="6" fill="#fff" transform={`rotate(${rot} ${cx} 50)`} />;
      default:
        return <rect x={cx - 6} y={36} width="12" height="32" rx="6" fill="#fff" transform={`rotate(${rot} ${cx} 52)`} />;
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label={`Strobi, ${mood}`}>
      <defs>
        <radialGradient id={`g${id}`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#9ccbff" />
          <stop offset="0.5" stopColor="#2E8BFF" />
          <stop offset="1" stopColor="#1757c4" />
        </radialGradient>
      </defs>

      {/* Headphones behind body */}
      {mood === "headphones" && (
        <>
          <path d="M12 52 C12 20, 88 20, 88 52" stroke="#12110F" strokeWidth="7" strokeLinecap="round" fill="none" />
          <rect x="4" y="42" width="14" height="24" rx="7" fill="#D9FF45" stroke="#12110F" strokeWidth="3" />
          <rect x="82" y="42" width="14" height="24" rx="7" fill="#D9FF45" stroke="#12110F" strokeWidth="3" />
        </>
      )}

      {/* Crown unlocked at level >= 10 */}
      {level >= 10 && (
        <polygon points="34,14 40,4 50,12 60,4 66,14" fill="#F5B301" stroke="#12110F" strokeWidth="2.5" strokeLinejoin="round" />
      )}

      <circle cx="50" cy="52" r="42" fill={`url(#g${id})`} />
      <ellipse cx="34" cy="30" rx="12" ry="7" fill="#fff" opacity="0.35" transform="rotate(-30 34 30)" />
      {eye(52, 8)}
      {eye(72, 8)}

      {/* Glasses unlocked at level >= 5 (or reading pose) */}
      {(level >= 5 || mood === "reading") && (
        <g stroke="#12110F" strokeWidth="2.8" fill="none">
          <rect x="41" y="39" width="18" height="16" rx="5" />
          <rect x="63" y="39" width="18" height="16" rx="5" />
          <line x1="59" y1="47" x2="63" y2="47" />
        </g>
      )}

      {/* Scarf unlocked at level >= 2 */}
      {level >= 2 && (
        <path d="M22 82 Q50 92 78 82 L74 91 Q50 98 26 91 Z" fill="#FF8B4A" stroke="#12110F" strokeWidth="2.5" />
      )}

      {/* Pose props */}
      {(mood === "cheer" || mood === "cheering" || mood === "celebrate") && (
        <circle cx="82" cy="68" r="5" fill="#FF8B4A" opacity="0.8" />
      )}
      {mood === "sparkle" && (
        <path d="M84 16 L86 22 L92 24 L86 26 L84 32 L82 26 L76 24 L82 22 Z" fill="#D9FF45" stroke="#12110F" strokeWidth="2" />
      )}
      {mood === "sad-no-streak" && (
        <path d="M80 62 C80 68, 86 70, 86 64 C86 60, 82 56, 80 62 Z" fill="#9ccbff" stroke="#1757c4" strokeWidth="1.5" />
      )}
      {mood === "reading" && (
        <path d="M26 76 L50 70 L74 76 V92 L50 86 L26 92 Z" fill="#E8E4FF" stroke="#12110F" strokeWidth="2.5" strokeLinejoin="round" />
      )}
    </svg>
  );
}
