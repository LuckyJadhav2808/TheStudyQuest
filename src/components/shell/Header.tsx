"use client";
import { usePathname, useRouter } from "next/navigation";
import { Coins, Command, Fire, Lightning, PawPrint, Plus, WifiSlash, Question } from "@phosphor-icons/react";
import { useGame, useSettings } from "@/core/settings";
import { levelProgress } from "@/core/gamification";
import { CountUp } from "@/components/ui/misc";
import { useUI } from "./ui-store";
import { ALL_PAGES } from "./nav";

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Header() {
  const s = useSettings();
  const g = useGame();
  const ui = useUI();
  const router = useRouter();
  const path = usePathname();
  const lp = levelProgress(g.xp);

  const isHome = path === "/";
  const defaultPage = ALL_PAGES.find((p) => p.href === path);

  const title = isHome
    ? `${greeting()}, ${s.name}`
    : ui.pageHeader?.title ?? defaultPage?.label ?? "StudyQuest";

  const subtitle = isHome
    ? "Make it count."
    : ui.pageHeader?.subtitle ?? defaultPage?.desc ?? "";

  return (
    <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between gap-3 px-4 pt-2 pb-1 border-b border-line/10 bg-canvas/80 backdrop-blur-sm z-30">
      {/* Left: Page Title + conditional subtitle */}
      <div className="min-w-0 flex items-baseline gap-3">
        <h1 className="font-display truncate text-2xl sm:text-3xl font-extrabold text-ink leading-none">
          {title}
        </h1>
        {subtitle && (
          <span className="hidden [@media(min-height:800px)]:inline-block truncate text-xs text-muted font-medium">
            {subtitle}
          </span>
        )}
      </div>

      {/* Right: Actions, Stat Chips, and Tooltip Buttons */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {ui.pageHeader?.actions && (
          <div className="hidden sm:flex items-center gap-1.5 mr-1">
            {ui.pageHeader.actions}
          </div>
        )}

        {!ui.online && (
          <span className="chip bg-orange text-ink font-bold text-xs" role="status">
            <WifiSlash size={15} weight="bold" />
            <span className="hidden sm:inline">Offline</span>
          </span>
        )}

        {/* Streak chip - single source of truth from useGame */}
        <span
          className="chip hidden sm:inline-flex"
          title={`Active Streak: ${g.streak} days`}
          aria-label={`${g.streak} day streak`}
        >
          <Fire size={16} weight="fill" className="text-orange" />
          <CountUp value={g.streak} />
        </span>

        {/* Level / XP */}
        <span
          className="chip"
          title={`${lp.into}/${lp.need} XP to level ${lp.level + 1} (${g.xp.toLocaleString()} total XP)`}
          aria-label={`Level ${lp.level}, ${g.xp} XP`}
        >
          <Lightning size={16} weight="fill" className="text-violet" />
          <span className="num font-bold">L{lp.level}</span>
          <span className="num hidden text-muted sm:inline text-xs">{g.xp.toLocaleString()} XP</span>
        </span>

        {/* Coins */}
        <span
          className="chip"
          title={`${g.coins.toLocaleString()} Coins`}
          aria-label={`${g.coins} coins`}
        >
          <Coins size={16} weight="fill" className="text-legend" />
          <CountUp value={g.coins} />
        </span>

        {/* Icon Action Buttons with proper tooltips & aria-labels */}
        <button
          className="btn btn-icon btn-ghost hidden border-0 sm:inline-flex hover:bg-soft"
          aria-label="Open companions (Pets)"
          title="Companions (Pets)"
          onClick={() => ui.set({ companion: true })}
        >
          <PawPrint size={20} weight="duotone" />
        </button>

        <button
          className="btn btn-icon btn-ghost hidden border-0 sm:inline-flex hover:bg-soft"
          aria-label="Open command palette (Ctrl+K)"
          title="Command Palette (Ctrl+K)"
          onClick={() => ui.set({ palette: true })}
        >
          <Command size={20} weight="duotone" />
        </button>

        <button
          className="btn btn-icon btn-ghost hidden border-0 lg:inline-flex hover:bg-soft"
          aria-label="Keyboard shortcuts (?)"
          title="Keyboard shortcuts (?)"
          onClick={() => ui.set({ shortcuts: true })}
        >
          <Question size={20} weight="duotone" />
        </button>

        <button
          className="btn btn-lime btn-icon shadow-sm hover:scale-105 active:scale-95"
          aria-label="Quick add task (C)"
          title="Quick add (C)"
          onClick={() => ui.set({ quickAdd: "task" })}
        >
          <Plus size={20} weight="bold" />
        </button>
      </div>
    </header>
  );
}
