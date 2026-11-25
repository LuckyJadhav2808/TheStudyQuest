"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { pomodoroXp } from "@/core/gamification";
import { todayKey } from "@/lib/utils";

export type TimerKind = "focus" | "short" | "long";
export interface Summary { minutes: number; subject: string; xp: number }
export interface AbandonedBlock { date: string; minutes: number; at: number }
interface TimerState {
  kind: TimerKind; mins: Record<TimerKind, number>; running: boolean; endsAt: number; remainingMs: number;
  subject: string; shield: number; awayAt: number; cycle: number; summary: Summary | null;
  abandonedLogs: AbandonedBlock[];
  start: () => void; pause: () => void; reset: () => void; setKind: (k: TimerKind) => void; setMins: (k: TimerKind, m: number) => void;
  setSubject: (s: string) => void; finish: () => number; set: (p: Partial<TimerState>) => void; clearSummary: () => void;
}
export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      kind: "focus", mins: { focus: 25, short: 5, long: 15 }, running: false, endsAt: 0, remainingMs: 25 * 60000,
      subject: "", shield: 100, awayAt: 0, cycle: 0, summary: null,
      abandonedLogs: [],
      start: () => { const s = get(); if (s.running) return; const rem = s.remainingMs > 0 ? s.remainingMs : s.mins[s.kind] * 60000; set({ running: true, endsAt: Date.now() + rem, remainingMs: rem, shield: s.kind === "focus" ? 100 : s.shield }); },
      pause: () => { const s = get(); if (s.running) set({ running: false, remainingMs: Math.max(0, s.endsAt - Date.now()) }); },
      reset: () => set((s) => {
        const total = s.mins[s.kind] * 60000;
        const rem = s.running ? Math.max(0, s.endsAt - Date.now()) : s.remainingMs;
        const elapsed = total - rem;
        const shouldRecordAbandon = s.kind === "focus" && elapsed >= 5000 && rem > 0;
        const nextAbandoned = shouldRecordAbandon
          ? [...(s.abandonedLogs ?? []).slice(-199), { date: todayKey(), minutes: Math.max(1, Math.round(elapsed / 60000)), at: Date.now() }]
          : (s.abandonedLogs ?? []);
        return { running: false, remainingMs: total, shield: 100, abandonedLogs: nextAbandoned };
      }),
      setKind: (k) => set((s) => ({ kind: k, running: false, remainingMs: s.mins[k] * 60000 })),
      setMins: (k, m) => set((s) => {
        const clamped = Math.min(240, Math.max(1, Math.round(m) || 1));
        return { mins: { ...s.mins, [k]: clamped }, remainingMs: !s.running && s.kind === k ? clamped * 60000 : s.remainingMs };
      }),
      setSubject: (subject) => set({ subject }),
      clearSummary: () => set({ summary: null }),
      finish: () => {
        const s = get();
        const focus = s.kind === "focus";
        const minutes = s.mins[s.kind];
        const next: TimerKind = focus ? ((s.cycle + 1) % 4 === 0 ? "long" : "short") : "focus";
        set({ running: false, kind: next, remainingMs: s.mins[next] * 60000, cycle: focus ? s.cycle + 1 : s.cycle, summary: focus ? { minutes, subject: s.subject, xp: pomodoroXp(minutes) } : null });
        return focus ? minutes : 0;
      },
      set: (p) => set((s) => ({
        ...p,
        shield: typeof p.shield === "number" ? Math.min(100, Math.max(0, p.shield)) : s.shield,
      })),
    }),
    { name: "sq-timer", skipHydration: true, partialize: (s) => ({ kind: s.kind, mins: s.mins, running: s.running, endsAt: s.endsAt, remainingMs: s.remainingMs, subject: s.subject, shield: s.shield, cycle: s.cycle, abandonedLogs: s.abandonedLogs }) }
  )
);
