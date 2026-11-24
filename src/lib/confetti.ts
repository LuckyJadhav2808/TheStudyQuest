"use client";
import confetti from "canvas-confetti";

export function fireConfetti(big = false): void {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confetti({
    particleCount: big ? 140 : 50,
    spread: big ? 90 : 60,
    origin: { y: 0.75 },
    colors: ["#D9FF45", "#FF8B4A", "#7C5CFF", "#1FD6C1", "#2E8BFF"],
    disableForReducedMotion: true,
  });
}
