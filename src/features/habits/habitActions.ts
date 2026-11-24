import { db } from "@/core/db";
import { emit } from "@/core/events";
import { habitLogsRepo } from "@/core/repos";
import { todayKey } from "@/lib/utils";
import { streaks } from "./habitUtils";

export async function toggleHabit(habitId: string, name: string): Promise<void> {
  const today = todayKey();
  const all = await db.habitLogs.toArray();
  const ex = all.find((l) => l.habitId === habitId && l.date === today);
  if (ex) { await habitLogsRepo.remove(ex.id); return; }
  await habitLogsRepo.add({ habitId, date: today } as never);
  const shield = (await db.buffs.toArray()).some((b) => b.kind === "shield" && b.expiresAt > Date.now());
  emit("habit.checked", { name, streak: streaks(await db.habitLogs.toArray(), habitId, shield).current });
}
