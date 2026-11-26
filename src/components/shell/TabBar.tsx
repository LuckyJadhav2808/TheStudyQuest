"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ListChecks, NotePencil, Timer } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/timer", label: "Focus", icon: Timer },
  null,
  { href: "/notes", label: "Notes", icon: NotePencil },
  { href: "/tasks", label: "Quests", icon: ListChecks },
] as const;

export function TabBar() {
  const path = usePathname();
  return (
    <nav aria-label="Primary mobile" className="fixed inset-x-0 bottom-0 z-40 sm:hidden">
      <div className="tabbar-mask mx-2 mb-[max(8px,env(safe-area-inset-bottom))] grid h-[62px] grid-cols-[1fr_1fr_76px_1fr_1fr] items-center rounded-full bg-surface-inverse px-2 text-on-inverse">
        {TABS.map((t, i) => {
          if (!t) return <span key={i} aria-hidden />;
          const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={cn("flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-bold", on ? "text-primary" : "text-on-inverse/70")}>
              <Icon size={22} weight={on ? "fill" : "duotone"} />{t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
