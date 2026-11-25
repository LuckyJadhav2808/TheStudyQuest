"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import NumberFlow from "@number-flow/react";
import { ArrowsIn, ArrowsOut, Coins, Command, Fire, Lightning, Moon, PawPrint, Plus, Sun, WifiSlash, Question } from "@phosphor-icons/react";
import { useGame, useSettings } from "@/core/settings";
import { levelProgress } from "@/core/gamification";
import { switchThemeWithRipple } from "@/lib/themeRipple";
import { useUI } from "./ui-store";
import { ALL_PAGES } from "./nav";
import { SeededAvatar } from "@/components/illustrations/SeededAvatar";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prevXp = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const syncFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    syncFs();
    document.addEventListener("fullscreenchange", syncFs);
    return () => document.removeEventListener("fullscreenchange", syncFs);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  };

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
      <div className="min-w-0 flex-1 flex items-center gap-2.5">
        <SeededAvatar seed={s.avatarSeed || "strobi"} size={32} className="hidden shrink-0 sm:inline-grid" />
        <div className="min-w-0 flex-1 flex items-baseline gap-3">
          <h1
            title={typeof title === "string" ? title : undefined}
            className="font-display truncate text-lg sm:text-2xl font-extrabold text-fg leading-tight"
            suppressHydrationWarning
          >
            {title}
          </h1>
          {subtitle && (
            <span className="hidden shrink-0 md:[@media(min-height:800px)]:inline-block truncate text-xs text-muted font-medium" suppressHydrationWarning>
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
          <NumberFlow value={g.streak} className="num font-bold" />
        </span>

        {/* Level / XP with thin progress arc */}
        <span
          data-tour="xp-chip"
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
          <span className="num font-bold">Lv <NumberFlow value={lp.level} /></span>
          <span className="num hidden text-muted sm:inline text-xs"><NumberFlow value={g.xp} /> XP</span>
        </span>

        {/* Coins */}
        <span
          className="chip"
          title={`${g.coins.toLocaleString()} Coins`}
          aria-label={`${g.coins} coins`}
        >
          <Coins size={16} weight="fill" className="text-legend" />
          <NumberFlow value={g.coins} className="num font-bold" />
        </span>

        {/* Icon Action Buttons with proper tooltips & aria-labels */}
        <button
          type="button"
          className="btn btn-icon btn-ghost border-0 inline-flex hover:bg-soft"
          aria-label={s.theme === "ink" ? "Switch to light mode" : "Switch to dark mode"}
          title={s.theme === "ink" ? "Light mode" : "Dark mode"}
          onClick={(e) => switchThemeWithRipple(s.theme === "ink" ? "paper" : "ink", e)}
        >
          {s.theme === "ink" ? <Sun size={19} weight="duotone" /> : <Moon size={19} weight="duotone" />}
        </button>

        <button
          className="btn btn-icon btn-ghost hidden border-0 sm:inline-flex hover:bg-soft"
          aria-label="Open companions (Pets)"
          title="Companions (Pets)"
          onClick={() => ui.set({ companion: true })}
        >
          <PawPrint size={20} weight="duotone" />
        </button>

        <button
          data-tour="command-palette"
          className="btn btn-icon btn-ghost hidden border-0 sm:inline-flex hover:bg-soft"
          aria-label="Open command palette (Ctrl+K)"
          title="Command Palette (Ctrl+K)"
          onClick={() => ui.set({ palette: true })}
        >
          <Command size={20} weight="duotone" />
        </button>

        <button
          className="btn btn-icon btn-ghost hidden border-0 sm:inline-flex hover:bg-soft"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <ArrowsIn size={20} weight="duotone" /> : <ArrowsOut size={20} weight="duotone" />}
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
          data-tour="quick-add"
          className={`btn btn-icon shadow-sm hover:scale-105 active:scale-95 ${
            ui.pageHeader?.actions ? "bg-surface text-fg hover:bg-soft" : "btn-lime"
          }`}
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
