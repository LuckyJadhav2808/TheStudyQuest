"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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

const hue = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360;

export function Header() {
  const s = useSettings();
  const g = useGame();
  const ui = useUI();
  const path = usePathname();
  const [mounted, setMounted] = useState(false);
  const [xpPulse, setXpPulse] = useState(false);
  const prevXp = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (prevXp.current !== null && g.xp > prevXp.current) {
      setXpPulse(true);
      const id = setTimeout(() => setXpPulse(false), 650);
      prevXp.current = g.xp;
      return () => clearTimeout(id);
    }
    prevXp.current = g.xp;
  }, [g.xp]);

  const lp = levelProgress(g.xp);
  const xpRatio = lp.need > 0 ? Math.min(1, Math.max(0, lp.into / lp.need)) : 0;

  const isHome = path === "/";
  const defaultPage = ALL_PAGES.find((p) => p.href === path);

  const title = isHome
    ? mounted
      ? `${greeting()}, ${s.name}`
      : `Welcome, ${s.name}`
    : ui.pageHeader?.title ?? defaultPage?.label ?? "StudyQuest";

  const subtitle = isHome
    ? "Make it count."
    : ui.pageHeader?.subtitle ?? defaultPage?.desc ?? "";

  return (
    <header
      style={{ paddingLeft: "var(--gutter, 16px)", paddingRight: "var(--gutter, 16px)" }}
      className="flex h-14 sm:h-16 shrink-0 items-center justify-between gap-3 pt-2 pb-1 border-b border-line/10 bg-canvas/80 backdrop-blur-sm z-30"
    >
      {/* Left: Avatar + Page Title + conditional subtitle */}
      <div className="min-w-0 flex items-center gap-2.5">
        <span
          className="font-display hidden sm:grid size-8 shrink-0 place-items-center rounded-full border-[1.5px] border-ink text-xs font-extrabold text-ink"
          style={{ background: `hsl(${hue(s.avatarSeed || "strobi")} 80% 75%)` }}
          aria-hidden
        >
          {(s.name || "S").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex items-baseline gap-3">
          <h1 className="font-display truncate text-2xl sm:text-3xl font-extrabold text-fg leading-none" suppressHydrationWarning>
            {title}
          </h1>
          {subtitle && (
            <span className="hidden [@media(min-height:800px)]:inline-block truncate text-xs text-muted font-medium" suppressHydrationWarning>
              {subtitle}
            </span>
          )}
        </div>
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

        {/* Level / XP with thin progress arc */}
        <span
          className={`chip transition-transform duration-300 ${xpPulse ? "scale-110 bg-lime text-ink" : ""}`}
          title={`${lp.into}/${lp.need} XP to level ${lp.level + 1} (${g.xp.toLocaleString()} total XP)`}
          aria-label={`Level ${lp.level}, ${g.xp} XP`}
        >
          <span className="relative grid size-5 place-items-center shrink-0">
            <svg viewBox="0 0 24 24" className="absolute inset-0 size-full -rotate-90" aria-hidden>
              <circle cx="12" cy="12" r="10" fill="none" stroke="color-mix(in srgb, var(--fg) 15%, transparent)" strokeWidth="2.5" />
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="var(--color-violet)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 10}
                strokeDashoffset={2 * Math.PI * 10 * (1 - xpRatio)}
              />
            </svg>
            <Lightning size={11} weight="fill" className="text-violet relative z-10" />
          </span>
          <span className="num font-bold">Lv {lp.level}</span>
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
