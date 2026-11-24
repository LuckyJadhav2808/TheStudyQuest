import { differenceInCalendarDays, parseISO, subDays } from "date-fns";
import { todayKey } from "@/lib/utils";
import type { HabitLog } from "@/core/types";

export function streaks(logs: HabitLog[], habitId: string, shield: boolean): { current: number; best: number } {
  const days = new Set(logs.filter((l) => l.habitId === habitId && !l.deletedAt).map((l) => l.date));
  let current = 0, gaps = 0;
  for (let i = 0; i < 400; i++) {
    const k = todayKey(subDays(new Date(), i));
    if (days.has(k)) current++;
    else if (i === 0) continue;
    else if (shield && gaps === 0) gaps++;
    else break;
  }
  const sorted = [...days].sort();
  let best = 0, run = 0;
  sorted.forEach((d, i) => { run = i > 0 && differenceInCalendarDays(parseISO(d), parseISO(sorted[i - 1])) === 1 ? run + 1 : 1; best = Math.max(best, run); });
  return { current, best: Math.max(best, current) };
}
