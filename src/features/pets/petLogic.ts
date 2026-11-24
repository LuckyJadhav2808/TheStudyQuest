import { clamp } from "@/lib/utils";
import type { Gamification, Pet } from "@/core/types";

export const SPECIES = [
  { id: "noctis", name: "Noctis", kind: "Owl", color: "#7C5CFF" }, { id: "whiskers", name: "Whiskers", kind: "Cat", color: "#FF8B4A" },
  { id: "ignis", name: "Ignis", kind: "Dragon", color: "#FF5A4A" }, { id: "kitsune", name: "Kitsune", kind: "Fox", color: "#FFB020" },
  { id: "luna", name: "Luna", kind: "Bunny", color: "#B9A6FF" },
] as const;
export const STAGES = ["Egg", "Baby", "Teen", "Adult", "Legendary"];
export interface Reqs { focusHours: number; tasks: number; streak: number; feedings: number }
export const REQ: Reqs[] = [{ focusHours: 0, tasks: 0, streak: 0, feedings: 0 }, { focusHours: 0, tasks: 0, streak: 0, feedings: 1 }, { focusHours: 2, tasks: 3, streak: 0, feedings: 5 }, { focusHours: 10, tasks: 20, streak: 3, feedings: 15 }, { focusHours: 40, tasks: 100, streak: 14, feedings: 40 }];

export function progressFor(p: Pet, g: Gamification): { label: string; have: number; need: number }[] {
  const r = REQ[Math.min(4, p.stage + 1)];
  return [
    { label: "Focus hours", have: Math.floor(g.focusMinutes / 60), need: r.focusHours }, { label: "Quests done", have: g.tasksDone, need: r.tasks },
    { label: "Best streak", have: g.bestStreak, need: r.streak }, { label: "Feedings", have: p.feedings, need: r.feedings },
  ];
}
export const canEvolve = (p: Pet, g: Gamification): boolean => p.stage < 4 && progressFor(p, g).every((x) => x.have >= x.need);
export function decayed(p: Pet, now: number, slow: number): Pet {
  const h = Math.max(0, (now - p.lastTick) / 3.6e6);
  if (h < 0.02) return p;
  const hunger = clamp(p.hunger - h * 4 * (1 - slow), 0, 100);
  return { ...p, hunger, happiness: clamp(p.happiness - h * (hunger < 30 ? 4 : 1.5), 0, 100), energy: clamp(p.energy + h * 5, 0, 100), lastTick: now };
}
export const moodOf = (p: Pet): "happy" | "sleepy" | "alert" | "idle" => (p.hunger < 20 ? "alert" : p.energy < 20 ? "sleepy" : p.happiness > 70 ? "happy" : "idle");
