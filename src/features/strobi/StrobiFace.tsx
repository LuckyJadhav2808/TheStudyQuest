"use client";
import { useId } from "react";
import type { Mood } from "./store";

/** 2D Strobi: used for fallback, toasts, empty states, 404 and login. */
export function StrobiFace({ mood = "idle", size = 48, className }: { mood?: Mood; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const eye = (cx: number, rot: number) => {
    switch (mood) {
      case "happy":
      case "cheer":
      case "celebrate":
        return <path d={`M${cx - 7} 54 Q${cx} 42 ${cx + 7} 54`} stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" transform={`rotate(${rot} ${cx} 50)`} />;
      case "sleepy":
        return <rect x={cx - 8} y={52} width="16" height="5" rx="2.5" fill="#fff" transform={`rotate(${rot} ${cx} 54)`} />;
      case "alert":
        return <rect x={cx - 6} y={32} width="12" height="40" rx="6" fill="#fff" />;
      case "thinking":
        return <rect x={cx - 6} y={cx > 60 ? 34 : 40} width="12" height={cx > 60 ? 34 : 24} rx="6" fill="#fff" transform={`rotate(${rot} ${cx} 50)`} />;
      default:
        return <rect x={cx - 6} y={36} width="12" height="32" rx="6" fill="#fff" transform={`rotate(${rot} ${cx} 52)`} />;
    }
  };
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label={`Strobi, feeling ${mood}`}>
      <defs>
        <radialGradient id={`g${id}`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#9ccbff" />
          <stop offset="0.5" stopColor="#2E8BFF" />
          <stop offset="1" stopColor="#1757c4" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="42" fill={`url(#g${id})`} />
      <ellipse cx="34" cy="30" rx="12" ry="7" fill="#fff" opacity="0.35" transform="rotate(-30 34 30)" />
      {eye(52, 8)}
      {eye(72, 8)}
      {(mood === "cheer" || mood === "celebrate") && <circle cx="82" cy="68" r="5" fill="#FF8B4A" opacity="0.7" />}
    </svg>
  );
}
