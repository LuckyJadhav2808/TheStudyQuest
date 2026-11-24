"use client";
import { create } from "zustand";

export type Mood = "idle" | "happy" | "cheer" | "sleepy" | "alert" | "thinking" | "celebrate";
interface StrobiState {
  mood: Mood; bounce: number; squash: number; lastActivity: number; menuOpen: boolean;
  setMood: (m: Mood, ttl?: number) => void; poke: () => void; touch: () => void; setMenu: (o: boolean) => void;
}
let timer: ReturnType<typeof setTimeout> | undefined;
export const useStrobi = create<StrobiState>((set) => ({
  mood: "idle", bounce: 0, squash: 0, lastActivity: Date.now(), menuOpen: false,
  setMood: (mood, ttl = 3200) => {
    if (timer) clearTimeout(timer);
    set((s) => ({ mood, bounce: mood === "happy" || mood === "cheer" || mood === "celebrate" ? s.bounce + 1 : s.bounce }));
    if (mood !== "idle" && mood !== "sleepy" && ttl > 0) timer = setTimeout(() => set({ mood: "idle" }), ttl);
  },
  poke: () => set((s) => ({ squash: s.squash + 1 })),
  touch: () => set((s) => ({ lastActivity: Date.now(), mood: s.mood === "sleepy" ? "idle" : s.mood })),
  setMenu: (menuOpen) => set({ menuOpen }),
}));
