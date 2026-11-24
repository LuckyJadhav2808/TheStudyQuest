"use client";
import { create } from "zustand";

export type QuickKind = "task" | "note" | "habit" | "exam";

export interface PageHeaderInfo {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

interface UIState {
  palette: boolean;
  quickAdd: QuickKind | null;
  shortcuts: boolean;
  launcher: string | null;
  changelog: boolean;
  companion: boolean;
  online: boolean;
  pageHeader: PageHeaderInfo | null;
  set: (p: Partial<Omit<UIState, "set">>) => void;
}
export const useUI = create<UIState>((set) => ({
  palette: false,
  quickAdd: null,
  shortcuts: false,
  launcher: null,
  changelog: false,
  companion: false,
  online: true,
  pageHeader: null,
  set: (p) => set(p),
}));
