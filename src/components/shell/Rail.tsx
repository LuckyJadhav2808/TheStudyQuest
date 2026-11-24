"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GROUPS, groupForPath } from "./nav";
import { useUI } from "./ui-store";
import { cn } from "@/lib/utils";

export function Rail() {
  const path = usePathname();
  const active = groupForPath(path);
  const setUI = useUI((s) => s.set);
  return (
    <nav aria-label="Primary" className="hidden shrink-0 p-3 pr-0 sm:block sm:py-4 sm:pl-4">
      <div className="flex h-full w-[68px] flex-col items-center gap-1 rounded-full bg-ink px-2 py-4 [data-theme=ink]:border [data-theme=ink]:border-white/10">
        <span className="font-display mb-2 grid size-10 place-items-center rounded-full bg-lime text-lg text-ink" aria-hidden>S</span>
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto">
          {GROUPS.map((g) => {
            const Icon = g.icon;
            const on = g.id === active;
            const cls = cn("group relative grid size-12 place-items-center rounded-full transition", on ? "bg-paper text-ink shadow-[0_0_0_4px_#0b0b0c]" : "text-paper/75 hover:bg-white/10 hover:text-paper");
            const tip = <span role="tooltip" className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-paper opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">{g.label}</span>;
            const notchCut = (
              <>
                <span aria-hidden className={cn("inv-corner pointer-events-none transition-opacity", on ? "opacity-100" : "opacity-0")} style={{ right: -6, top: -10, width: 10, height: 10, background: "radial-gradient(circle at 100% 0, transparent 9.5px, #0b0b0c 10px)" }} />
                <span aria-hidden className={cn("inv-corner pointer-events-none transition-opacity", on ? "opacity-100" : "opacity-0")} style={{ right: -6, bottom: -10, width: 10, height: 10, background: "radial-gradient(circle at 100% 100%, transparent 9.5px, #0b0b0c 10px)" }} />
              </>
            );
            return g.href ? (
              <Link key={g.id} href={g.href} aria-label={g.label} aria-current={on ? "page" : undefined} className={cls}>
                <Icon size={24} weight={on ? "fill" : "duotone"} />{notchCut}{tip}
              </Link>
            ) : (
              <button key={g.id} aria-label={`${g.label} pages`} aria-haspopup="dialog" onClick={() => setUI({ launcher: g.id })} className={cls}>
                <Icon size={24} weight={on ? "fill" : "duotone"} />{notchCut}{tip}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
