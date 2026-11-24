"use client";
import { Command } from "cmdk";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { db } from "@/core/db";
import { updateSettings } from "@/core/settings";
import type { ThemeName } from "@/core/types";
import { ALL_PAGES } from "./nav";
import { useUI } from "./ui-store";

const THEMES: ThemeName[] = ["paper", "ink", "lavender", "peach"];
export function CommandPalette() {
  const { palette, set } = useUI();
  const router = useRouter();
  const notes = useLiveQuery(() => db.notes.toArray(), [], []);
  const run = (fn: () => void) => () => { set({ palette: false }); fn(); };
  const item = "flex min-h-11 cursor-pointer items-center gap-3 rounded-full px-4 text-sm font-semibold data-[selected=true]:bg-lime data-[selected=true]:text-ink";
  const head = "px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted";
  return (
    <Command.Dialog open={palette} onOpenChange={(o) => set({ palette: o })} label="Command palette" overlayClassName="fixed inset-0 z-[80] bg-black/50" contentClassName="fixed left-1/2 top-[12dvh] z-[81] w-[min(94vw,560px)] -translate-x-1/2 overflow-hidden rounded-[32px] border-[1.5px] border-line bg-surface p-3 text-fg shadow-2xl">
      <Command.Input autoFocus placeholder="Jump to a page, search notes, run an action..." className="input mb-2" />
      <Command.List className="scroll-thin max-h-[52dvh]">
        <Command.Empty className="p-6 text-center text-sm text-muted">Nothing matches. Strobi checked twice.</Command.Empty>
        <Command.Group heading={<div className={head}>Quick actions</div>}>
          <Command.Item className={item} onSelect={run(() => set({ quickAdd: "task" }))}>Add a quest</Command.Item>
          <Command.Item className={item} onSelect={run(() => set({ quickAdd: "note" }))}>New note</Command.Item>
          <Command.Item className={item} onSelect={run(() => set({ quickAdd: "habit" }))}>New habit</Command.Item>
          <Command.Item className={item} onSelect={run(() => set({ quickAdd: "exam" }))}>Add exam</Command.Item>
          <Command.Item className={item} onSelect={run(() => set({ shortcuts: true }))}>Keyboard shortcuts</Command.Item>
          <Command.Item className={item} onSelect={run(() => set({ changelog: true }))}>What is new</Command.Item>
        </Command.Group>
        <Command.Group heading={<div className={head}>Pages</div>}>
          {ALL_PAGES.map((p) => (
            <Command.Item key={p.href} value={`${p.label} ${p.desc}`} className={item} onSelect={run(() => router.push(p.href))}>
              <p.icon size={18} weight="duotone" />{p.label}<span className="ml-auto hidden text-xs font-normal opacity-60 sm:inline">{p.desc}</span>
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading={<div className={head}>Theme</div>}>
          {THEMES.map((t) => <Command.Item key={t} value={`theme ${t}`} className={item} onSelect={run(() => void updateSettings({ theme: t }))}>Switch to {t}</Command.Item>)}
        </Command.Group>
        {notes.length > 0 && (
          <Command.Group heading={<div className={head}>Notes</div>}>
            {notes.filter((n) => !n.deletedAt).slice(0, 40).map((n) => <Command.Item key={n.id} value={`note ${n.title}`} className={item} onSelect={run(() => router.push(`/notes?id=${n.id}`))}>{n.title || "Untitled"}</Command.Item>)}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
