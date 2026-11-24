"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { DEFAULT_GAME, DEFAULT_SETTINGS, gameRepo, settingsRepo } from "./repos";
import type { Gamification, Settings } from "./types";

export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get("main"), [], undefined) ?? DEFAULT_SETTINGS;
}
export function useGame(): Gamification {
  return useLiveQuery(() => db.gamification.get("main"), [], undefined) ?? DEFAULT_GAME;
}
export const updateSettings = (p: Partial<Settings>) => settingsRepo.patch(p);

/** Creates the guest profile rows on first launch. */
export async function ensureProfile(): Promise<void> {
  if (!(await db.settings.get("main"))) await settingsRepo.patch({});
  if (!(await db.gamification.get("main"))) await gameRepo.mutate((g) => g);
}
