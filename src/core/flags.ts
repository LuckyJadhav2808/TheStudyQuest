"use client";
import { useSettings } from "./settings";

export const DEFAULT_FLAGS = {
  tracker: true, dsa: true, ml: true, notebook: true, code: true, ide: true, whiteboard: true,
  pets: true, shop: true, alchemy: true, skills: true, arcade: true, groups: true, admin: false, cloudSync: false,
} as const;
export type FlagName = keyof typeof DEFAULT_FLAGS;

export function useFlags(): Record<FlagName, boolean> {
  const s = useSettings();
  return { ...DEFAULT_FLAGS, ...(s.flags as Partial<Record<FlagName, boolean>>) };
}
export function useFlag(name: FlagName): boolean {
  return useFlags()[name];
}
