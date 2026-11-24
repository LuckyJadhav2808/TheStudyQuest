"use client";
import { create } from "zustand";

export type QuickKind = "task" | "note" | "habit" | "exam";
interface UIState {
  palette: boolean; quickAdd: QuickKind | null; shortcuts: boolean; launcher: string | null; changelog: boolean; companion: boolean; online: boolean;
  set: (p: Partial<Omit<UIState, "set">>) => void;
}
export const useUI = create<UIState>((set) => ({
  palette: false, quickAdd: null, shortcuts: false, launcher: null, changelog: false, companion: false, online: true,
  set: (p) => set(p),
}));
