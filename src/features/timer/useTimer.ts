"use client";
import { useEffect, useState } from "react";
import { useTimerStore } from "./store";

export function useTimer() {
  const s = useTimerStore();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!s.running) return;
    const i = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(i);
  }, [s.running]);
  const total = s.mins[s.kind] * 60000;
  const rem = s.running ? Math.max(0, s.endsAt - now) : s.remainingMs;
  return { ...s, rem, total, pct: total ? 1 - rem / total : 0 };
}
