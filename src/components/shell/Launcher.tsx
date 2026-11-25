"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";
import { Drawer } from "vaul";
import { useFlags } from "@/core/flags";
import { GROUPS, type NavItem } from "./nav";
import { useUI } from "./ui-store";
import { useIsMobile } from "@/components/ui/useMedia";
import { IconBadge } from "@/components/ui/misc";

export function Launcher() {
  const { launcher, set } = useUI();
  const pathname = usePathname();
  const flags = useFlags();
  const mobile = useIsMobile();
  const groups = GROUPS.filter((g) => g.items.length && (launcher === "all" || g.id === launcher));
  const close = useCallback(() => set({ launcher: null }), [set]);

  useEffect(() => {
    set({ launcher: null });
  }, [pathname, set]);

  useEffect(() => {
    if (!launcher) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [launcher, close]);

  const tile = (i: NavItem, color: string) => {
    const Icon = i.icon;
    const off = i.flag ? !flags[i.flag] : false;
    return (
      <Link
        key={i.href}
        href={i.href}
        onClick={close}
        className="flex min-h-[54px] items-center gap-3 rounded-[20px] bg-soft/70 p-2.5 transition hover:bg-lime/30 hover:-translate-y-0.5 active:translate-y-0"
      >
        <IconBadge color={color} className="!size-9 !rounded-xl"><Icon size={20} weight="duotone" /></IconBadge>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold leading-tight">{i.label}{off && " (off)"}</span>
          <span className="block truncate text-xs text-muted leading-tight">{i.desc}</span>
        </span>
      </Link>
    );
  };

  if (!launcher) return null;

  // Mobile: Vaul bottom sheet
  if (mobile) {
    return (
      <Drawer.Root open={true} onOpenChange={(o) => !o && close()} direction="bottom">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[85dvh] flex-col gap-3 rounded-t-[32px] border-[1.5px] border-line bg-surface p-5 text-fg outline-none">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-line/40" />
            <Drawer.Title className="font-display text-2xl">
              {launcher === "all" ? "All pages" : GROUPS.find((g) => g.id === launcher)?.label}
            </Drawer.Title>
            <Drawer.Description className="sr-only">Choose a page to open</Drawer.Description>
            <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
              {groups.map((g) => (
                <div key={g.id} className="flex flex-col gap-2">
                  {launcher === "all" && <p className="text-xs font-bold uppercase tracking-wider text-muted">{g.label}</p>}
                  {g.items.map((i) => tile(i, g.color))}
                </div>
              ))}
              {launcher === "all" && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Core</p>
                  {GROUPS.filter((g) => g.href).map((g) => tile({ href: g.href as string, label: g.label, desc: "Open " + g.label, icon: g.icon }, g.color))}
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // Desktop: Compact anchored popover next to the rail
  return (
    <>
      <div
        role="presentation"
        aria-hidden="true"
        onClick={close}
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px] transition-opacity"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={launcher === "all" ? "All pages" : GROUPS.find((g) => g.id === launcher)?.label}
        className="pop-in fixed left-[84px] top-14 z-[65] flex w-[320px] max-h-[min(520px,75dvh)] flex-col gap-3 rounded-[28px] border-[1.5px] border-line bg-surface p-4 text-fg shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between pb-1 border-b border-line/40">
          <h2 className="font-display text-lg font-bold">
            {launcher === "all" ? "All pages" : GROUPS.find((g) => g.id === launcher)?.label}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close launcher"
            className="rounded-full px-2 py-0.5 text-xs font-bold text-muted hover:bg-soft hover:text-fg"
          >
            Esc
          </button>
        </div>
        <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {groups.map((g) => (
            <div key={g.id} className="flex flex-col gap-1.5">
              {launcher === "all" && <p className="text-[11px] font-bold uppercase tracking-wider text-muted px-1">{g.label}</p>}
              {g.items.map((i) => tile(i, g.color))}
            </div>
          ))}
          {launcher === "all" && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted px-1">Core</p>
              {GROUPS.filter((g) => g.href).map((g) => tile({ href: g.href as string, label: g.label, desc: "Open " + g.label, icon: g.icon }, g.color))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
