"use client";
import Link from "next/link";
import { Drawer } from "vaul";
import { useFlags } from "@/core/flags";
import { GROUPS, type NavItem } from "./nav";
import { useUI } from "./ui-store";
import { useIsMobile } from "@/components/ui/useMedia";
import { IconBadge } from "@/components/ui/misc";

export function Launcher() {
  const { launcher, set } = useUI();
  const flags = useFlags();
  const mobile = useIsMobile();
  const groups = GROUPS.filter((g) => g.items.length && (launcher === "all" || g.id === launcher));
  const close = () => set({ launcher: null });
  const tile = (i: NavItem, color: string) => {
    const Icon = i.icon;
    const off = i.flag ? !flags[i.flag] : false;
    return (
      <Link key={i.href} href={i.href} onClick={close} className="flex min-h-14 items-center gap-3 rounded-[24px] bg-soft p-3 transition hover:-translate-y-0.5">
        <IconBadge color={color}><Icon size={22} weight="duotone" /></IconBadge>
        <span className="min-w-0"><span className="block truncate text-sm font-bold">{i.label}{off && " (off)"}</span><span className="block truncate text-xs text-muted">{i.desc}</span></span>
      </Link>
    );
  };
  return (
    <Drawer.Root open={launcher !== null} onOpenChange={(o) => !o && close()} direction={mobile ? "bottom" : "left"}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Drawer.Content className="fixed z-[61] flex flex-col gap-3 border-[1.5px] border-line bg-surface p-5 text-fg outline-none max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[85dvh] max-sm:rounded-t-[32px] sm:bottom-4 sm:left-[96px] sm:top-4 sm:w-[380px] sm:rounded-[32px]">
          <Drawer.Title className="font-display text-2xl">{launcher === "all" ? "All pages" : GROUPS.find((g) => g.id === launcher)?.label}</Drawer.Title>
          <Drawer.Description className="sr-only">Choose a page to open</Drawer.Description>
          <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-4 pb-2">
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
