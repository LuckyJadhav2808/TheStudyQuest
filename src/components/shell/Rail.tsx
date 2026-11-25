"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GROUPS, groupForPath } from "./nav";
import { useUI } from "./ui-store";
import { cn } from "@/lib/utils";
import { StrobiRailButton } from "@/features/strobi/StrobiDock";
import { tasksRepo } from "@/core/repos";
import { useRows } from "@/features/shared/hooks";

export function Rail() {
  const path = usePathname();
  const active = groupForPath(path);
  const setUI = useUI((s) => s.set);
  const tasks = useRows(tasksRepo) ?? [];
  const hasDueTasks = tasks.some((t) => t.status !== "done");

  const mainGroups = GROUPS.filter((g) => g.id !== "settings");
  const settingsGroup = GROUPS.find((g) => g.id === "settings");

  const renderItem = (g: (typeof GROUPS)[number]) => {
    const Icon = g.icon;
    const on = g.id === active;
    const showDot = g.id === "plan" && hasDueTasks;
    const cls = cn(
      "group relative grid place-items-center rounded-full transition shrink-0",
      on ? "bg-paper text-ink shadow-[0_0_0_4px_#0b0b0c]" : "text-paper/75 hover:bg-white/10 hover:text-paper"
    );
    const sizeStyle = { width: "clamp(36px, 5.5vh, 48px)", height: "clamp(36px, 5.5vh, 48px)" };
    const tip = (
      <span
        role="tooltip"
        className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-paper opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {g.label}
      </span>
    );
    const notchCut = (
      <>
        <span
          aria-hidden
          className={cn("inv-corner pointer-events-none transition-opacity", on ? "opacity-100" : "opacity-0")}
          style={{ right: -6, top: -10, width: 10, height: 10, background: "radial-gradient(circle at 100% 0, transparent 9.5px, #0b0b0c 10px)" }}
        />
        <span
          aria-hidden
          className={cn("inv-corner pointer-events-none transition-opacity", on ? "opacity-100" : "opacity-0")}
          style={{ right: -6, bottom: -10, width: 10, height: 10, background: "radial-gradient(circle at 100% 100%, transparent 9.5px, #0b0b0c 10px)" }}
        />
      </>
    );
    const dot = showDot ? (
      <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full bg-orange ring-2 ring-ink" />
    ) : null;

    return g.href ? (
      <Link key={g.id} href={g.href} aria-label={g.label} aria-current={on ? "page" : undefined} style={sizeStyle} className={cls}>
        <Icon size={22} weight={on ? "fill" : "duotone"} />
        {dot}
        {notchCut}
        {tip}
      </Link>
    ) : (
      <button key={g.id} aria-label={`${g.label} pages`} aria-haspopup="dialog" onClick={() => setUI({ launcher: g.id })} style={sizeStyle} className={cls}>
        <Icon size={22} weight={on ? "fill" : "duotone"} />
        {dot}
        {notchCut}
        {tip}
      </button>
    );
  };

  return (
    <nav aria-label="Primary" className="relative z-[70] hidden w-[84px] shrink-0 p-3 pr-0 sm:block sm:py-4 sm:pl-4">
      <div className="flex h-full w-[68px] flex-col items-center justify-between rounded-full bg-ink px-2 py-3 overflow-hidden [data-theme=ink]:border [data-theme=ink]:border-white/10">
        {/* Top: Strobi docked at top of rail */}
        <div className="shrink-0">
          <StrobiRailButton />
        </div>

        {/* Middle: Main navigation items */}
        <div
          style={{ gap: "clamp(4px, 1vh, 12px)" }}
          className="no-scrollbar flex flex-col items-center justify-center overflow-hidden w-full"
        >
          {mainGroups.map(renderItem)}
        </div>

        {/* Bottom: Settings */}
        <div className="shrink-0">
          {settingsGroup && renderItem(settingsGroup)}
        </div>
      </div>
    </nav>
  );
}
