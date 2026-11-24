"use client";
import { useRouter } from "next/navigation";
import { Coins, Command, Fire, Lightning, PawPrint, Plus, WifiSlash, Question } from "@phosphor-icons/react";
import { useGame, useSettings } from "@/core/settings";
import { levelProgress } from "@/core/gamification";
import { CountUp } from "@/components/ui/misc";
import { useUI } from "./ui-store";

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
export function Header() {
  const s = useSettings();
  const g = useGame();
  const ui = useUI();
  const router = useRouter();
  const lp = levelProgress(g.xp);
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 px-3 pt-2 sm:h-16 sm:px-4 sm:pt-4">
      <button onClick={() => router.push("/settings")} className="min-w-0 text-left" aria-label="Open profile settings">
        <span className="font-display block truncate text-xl leading-none sm:text-3xl">{greeting()}, {s.name}</span>
        <span className="mt-1 hidden truncate text-xs text-muted sm:block">{s.title} · level {lp.level}</span>
      </button>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {!ui.online && <span className="chip bg-orange text-ink" role="status"><WifiSlash size={16} weight="bold" /><span className="hidden sm:inline">Offline</span></span>}
        <span className="chip hidden sm:inline-flex" title="Streak"><Fire size={16} weight="fill" className="text-orange" /><CountUp value={g.streak} /></span>
        <span className="chip" title={`${lp.into}/${lp.need} XP to next level`}><Lightning size={16} weight="fill" className="text-violet" /><span className="num">L{lp.level}</span><span className="num hidden text-muted sm:inline">{g.xp.toLocaleString()} XP</span></span>
        <span className="chip" title="Coins"><Coins size={16} weight="fill" className="text-legend" /><CountUp value={g.coins} /></span>
        <button className="btn btn-icon btn-ghost hidden border-0 sm:inline-flex" aria-label="Open companions" onClick={() => ui.set({ companion: true })}><PawPrint size={22} weight="duotone" /></button>
        <button className="btn btn-icon btn-ghost hidden border-0 sm:inline-flex" aria-label="Open command palette (Ctrl K)" onClick={() => ui.set({ palette: true })}><Command size={22} weight="duotone" /></button>
        <button className="btn btn-icon btn-ghost hidden border-0 lg:inline-flex" aria-label="Keyboard shortcuts" onClick={() => ui.set({ shortcuts: true })}><Question size={22} weight="duotone" /></button>
        <button className="btn btn-lime btn-icon" aria-label="Quick add (C)" onClick={() => ui.set({ quickAdd: "task" })}><Plus size={22} weight="bold" /></button>
      </div>
    </header>
  );
}
