"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { StrobiDock } from "@/features/strobi/StrobiDock";
import { MiniTimer } from "@/features/timer/MiniTimer";
import { CompanionDrawer } from "@/features/pets/CompanionDrawer";
import { Header } from "./Header";
import { Rail } from "./Rail";
import { TabBar } from "./TabBar";
import { Launcher } from "./Launcher";
import { CommandPalette } from "./CommandPalette";
import { QuickAdd } from "./QuickAdd";
import { Changelog, Onboarding, Shortcuts } from "./Overlays";
import { Boot } from "./Boot";

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="flex h-dvh min-h-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-lime focus:px-4 focus:py-2 focus:text-ink">Skip to content</a>
      <Rail />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />
        <main id="main" className="min-h-0 flex-1 overflow-hidden pb-[88px] sm:pb-0">
          <div key={path} className="pop-in h-full">{children}</div>
        </main>
      </div>
      <TabBar />
      <StrobiDock />
      <MiniTimer />
      <Launcher />
      <CommandPalette />
      <QuickAdd />
      <Shortcuts />
      <Changelog />
      <CompanionDrawer />
      <Onboarding />
      <Boot />
    </div>
  );
}
