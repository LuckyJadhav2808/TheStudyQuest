"use client";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { DEFAULT_GAME, DEFAULT_SETTINGS, gameRepo, settingsRepo } from "./repos";
import type { Gamification, Settings } from "./types";

let cachedSettings: Settings | null = null;
let cachedGame: Gamification | null = null;

export function useSettings(): Settings {
  const [mounted, setMounted] = useState(false);
  const live = useLiveQuery(() => db.settings.get("main"), [], undefined);
  useEffect(() => {
    setMounted(true);
    if (live) cachedSettings = live;
  }, [live]);
  if (!mounted) return DEFAULT_SETTINGS;
  return live ?? cachedSettings ?? DEFAULT_SETTINGS;
}
export function useGame(): Gamification {
  const [mounted, setMounted] = useState(false);
  const live = useLiveQuery(() => db.gamification.get("main"), [], undefined);
  useEffect(() => {
    setMounted(true);
    if (live) cachedGame = live;
  }, [live]);
  if (!mounted) return DEFAULT_GAME;
  return live ?? cachedGame ?? DEFAULT_GAME;
}
export const updateSettings = (p: Partial<Settings>) => settingsRepo.patch(p);

/** Creates the guest profile rows on first launch. */
export async function ensureProfile(): Promise<void> {
  if (!(await db.settings.get("main"))) await settingsRepo.patch({});
  if (!(await db.gamification.get("main"))) await gameRepo.mutate((g) => g);
}
