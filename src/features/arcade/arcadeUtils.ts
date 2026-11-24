import { emit } from "@/core/events";
import { gameRepo } from "@/core/repos";
import { todayKey } from "@/lib/utils";

export const DAILY_CAP = 100;
/** Pays coins subject to the daily arcade cap. Returns the amount actually paid. */
export async function payout(coins: number): Promise<number> {
  const today = todayKey();
  let paid = 0;
  await gameRepo.mutate((g) => {
    const used = g.arcadeToday.date === today ? g.arcadeToday.coins : 0;
    paid = Math.max(0, Math.min(coins, DAILY_CAP - used));
    return { ...g, arcadeToday: { date: today, coins: used + paid } };
  });
  if (paid > 0) emit("arcade.win", { coins: paid });
  return paid;
}
