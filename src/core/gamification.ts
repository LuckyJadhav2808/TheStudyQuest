import type { Priority } from "./types";

export const MAX_LEVEL = 20;
export const xpForLevel = (L: number): number => 50 * L * (L + 1);
export function levelFromXp(xp: number): number {
  let L = 0;
  while (L < MAX_LEVEL && xp >= xpForLevel(L + 1)) L++;
  return L;
}
export function levelProgress(xp: number): { level: number; into: number; need: number; pct: number } {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return { level, into: 1, need: 1, pct: 1 };
  const base = xpForLevel(level);
  const need = xpForLevel(level + 1) - base;
  return { level, into: xp - base, need, pct: (xp - base) / need };
}
export const TITLES = ["Rookie Scholar","Page Turner","Note Ninja","Focus Cadet","Streak Keeper","Quiz Knight","Code Sprout","Bug Whisperer","Deep Diver","Syllabus Slayer","Flow Adept","Pomodoro Pro","Algorithm Ace","Mind Forger","Beast Tamer","Grandmaster","Sage","Archmage","Legend","Mythic","Studyquest Champion"];
export const titleForLevel = (L: number): string => TITLES[Math.min(L, TITLES.length - 1)];

export const XP = {
  task: 25, taskUrgent: 50, pomodoroPer25: 15, note: 10, habit: 10, codeRun: 2, codeRunDailyCap: 20,
  dsa: { easy: 30, medium: 50, hard: 75 } as Record<"easy" | "medium" | "hard", number>,
};
export const taskXp = (p: Priority): number => (p === "urgent" ? XP.taskUrgent : XP.task);
export const pomodoroXp = (minutes: number): number => Math.max(1, Math.round((minutes / 25) * XP.pomodoroPer25));
export interface Multipliers { xp: number; coins: number }
