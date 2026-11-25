"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Brain, Command, ListChecks, Timer } from "@phosphor-icons/react";
import { StrobiFace } from "./StrobiFace";
import { useStrobi } from "./store";
import { useUI } from "@/components/shell/ui-store";

const Scene = dynamic(() => import("./StrobiScene"), { ssr: false, loading: () => null });

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}
function Fallback() {
  const mood = useStrobi((s) => s.mood);
  return <StrobiFace mood={mood} size={96} className="size-full" />;
}

export function StrobiRailButton() {
  const [gl, setGl] = useState<boolean | null>(null);
  const { menuOpen, setMenu, poke, mood } = useStrobi();
  useEffect(() => {
    const handle = requestAnimationFrame(() => setGl(hasWebGL()));
    return () => cancelAnimationFrame(handle);
  }, []);

  return (
    <button
      type="button"
      aria-label={`Strobi the study guide, feeling ${mood}. Open quick menu`}
      aria-expanded={menuOpen}
      onClick={() => { poke(); setMenu(!menuOpen); }}
      style={{ width: "clamp(38px, 5.5vh, 48px)", height: "clamp(38px, 5.5vh, 48px)" }}
      className={`group relative grid place-items-center rounded-full bg-soft/15 text-paper transition hover:scale-105 hover:bg-soft/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime shrink-0 ${mood === "cheer" || mood === "celebrate" ? "animate-bounce" : ""}`}
    >
      <div className="size-9 overflow-hidden rounded-full pointer-events-none">
        {gl === null ? null : gl ? (
          <ErrorBoundary fallback={<Fallback />}><Scene /></ErrorBoundary>
        ) : (
          <Fallback />
        )}
      </div>
      <span role="tooltip" className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-paper opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">
        Strobi ({mood})
      </span>
    </button>
  );
}

export function StrobiDock() {
  const [gl, setGl] = useState<boolean | null>(null);
  const { menuOpen, setMenu, poke, mood } = useStrobi();
  const router = useRouter();
  const ui = useUI();
  useEffect(() => {
    const handle = requestAnimationFrame(() => setGl(hasWebGL()));
    return () => cancelAnimationFrame(handle);
  }, []);
  const go = (fn: () => void) => () => { setMenu(false); fn(); };
  return (
    <>
      {menuOpen && (
        <div role="menu" aria-label="Strobi quick menu" className="pop-in fixed bottom-[104px] left-1/2 z-[80] flex w-56 -translate-x-1/2 flex-col gap-1 rounded-[28px] border-[1.5px] border-ink bg-white p-2 text-ink shadow-2xl sm:top-4 sm:bottom-auto sm:left-[84px] sm:translate-x-0">
          {[
            { l: "Ask AI", i: <Brain size={20} weight="duotone" />, f: () => router.push("/chat") },
            { l: "Start Focus", i: <Timer size={20} weight="duotone" />, f: () => router.push("/timer") },
            { l: "Add Quest", i: <ListChecks size={20} weight="duotone" />, f: () => ui.set({ quickAdd: "task" }) },
            { l: "Open Palette", i: <Command size={20} weight="duotone" />, f: () => ui.set({ palette: true }) },
          ].map((m) => (
            <button key={m.l} role="menuitem" onClick={go(m.f)} className="flex min-h-11 items-center gap-3 rounded-full px-4 text-sm font-bold hover:bg-lime">{m.i}{m.l}</button>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-label={`Strobi the study guide, feeling ${mood}. Open quick menu`}
        aria-expanded={menuOpen}
        onClick={() => { poke(); setMenu(!menuOpen); }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+22px)] left-1/2 z-50 size-[68px] -translate-x-1/2 cursor-pointer rounded-full transition-transform hover:scale-105 sm:hidden"
      >
        {gl === null ? null : gl ? (
          <ErrorBoundary fallback={<Fallback />}><Scene /></ErrorBoundary>
        ) : (
          <Fallback />
        )}
      </button>
    </>
  );
}
