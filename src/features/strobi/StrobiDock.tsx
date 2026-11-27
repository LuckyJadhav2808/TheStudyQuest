"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { AnimatePresence, motion } from "motion/react";
import { Brain, Command, ListChecks, Timer } from "@phosphor-icons/react";
import { StrobiFace } from "./StrobiFace";
import { useStrobi } from "./store";
import { useUI } from "@/components/shell/ui-store";
import { useIsMobile } from "@/components/ui/useMedia";
import { useMotionConfig } from "@/lib/motion";

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
  const mobile = useIsMobile();
  const [gl, setGl] = useState<boolean | null>(null);
  const { menuOpen, setMenu, poke, setMood, mood } = useStrobi();
  useEffect(() => {
    if (mobile) return;
    const handle = requestAnimationFrame(() => setGl(hasWebGL()));
    return () => cancelAnimationFrame(handle);
  }, [mobile]);

  return (
    <button
      type="button"
      aria-label={`Strobi the study guide, feeling ${mood}. Open quick menu`}
      aria-expanded={menuOpen}
      onClick={() => {
        poke();
        setMood("happy", 1800);
        setMenu(!menuOpen);
      }}
      style={{ width: "clamp(38px, 5.5vh, 48px)", height: "clamp(38px, 5.5vh, 48px)" }}
      className={`group relative grid place-items-center rounded-full bg-soft/15 text-paper transition hover:scale-105 hover:bg-soft/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime shrink-0 ${mood === "cheer" || mood === "celebrate" ? "animate-bounce" : ""}`}
    >
      {/* Breathing outer glow & shadow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-full bg-strobi/25 blur-sm animate-pulse"
      />
      <div className="relative z-10 size-9 overflow-hidden rounded-full pointer-events-none">
        {mobile ? (
          <Fallback />
        ) : gl === null ? null : gl ? (
          <ErrorBoundary fallback={<Fallback />}><Scene /></ErrorBoundary>
        ) : (
          <Fallback />
        )}
      </div>
      {mood === "sleepy" && (
        <span aria-hidden className="pointer-events-none absolute -right-1 -top-1 text-[10px] font-black text-lime animate-bounce">
          z
        </span>
      )}
      <span role="tooltip" className="pointer-events-none absolute left-[calc(100%+16px)] z-50 flex items-center whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-paper opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">
        <span aria-hidden className="absolute -left-1 size-2.5 rotate-45 bg-ink" />
        <span className="relative z-10">Strobi ({mood})</span>
      </span>
    </button>
  );
}

export function StrobiDock() {
  const { menuOpen, setMenu, poke, setMood, mood } = useStrobi();
  const router = useRouter();
  const ui = useUI();
  const { bouncy } = useMotionConfig();
  const go = (fn: () => void) => () => { setMenu(false); fn(); };

  const fanItems = [
    { l: "Ask AI", i: <Brain size={20} weight="duotone" />, f: () => router.push("/chat"), x: 64, y: -12, bg: "bg-lavender text-[#12110f]" },
    { l: "Start Focus", i: <Timer size={20} weight="duotone" />, f: () => router.push("/timer"), x: 56, y: 38, bg: "bg-lime text-[#12110f]" },
    { l: "Add Quest", i: <ListChecks size={20} weight="duotone" />, f: () => ui.set({ quickAdd: "task" }), x: 30, y: 80, bg: "bg-peach text-[#12110f]" },
    { l: "Palette", i: <Command size={20} weight="duotone" />, f: () => ui.set({ palette: true }), x: -14, y: 102, bg: "bg-white text-[#12110f]" },
  ];

  return (
    <>
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Mobile compact menu */}
            <motion.div
              role="menu"
              aria-label="Strobi quick menu"
              initial={{ opacity: 0, scale: 0.85, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 16 }}
              transition={bouncy}
              className="fixed bottom-[104px] left-1/2 z-[80] flex w-56 -translate-x-1/2 flex-col gap-1 rounded-[28px] border-[1.5px] border-ink bg-white p-2 text-ink shadow-2xl sm:hidden"
            >
              {fanItems.map((m) => (
                <button key={m.l} role="menuitem" onClick={go(m.f)} className="flex min-h-11 items-center gap-3 rounded-full px-4 text-sm font-bold hover:bg-lime">
                  {m.i}{m.l}
                </button>
              ))}
            </motion.div>

            {/* Desktop: Radial fan of 4 circular buttons curving around Strobi */}
            <div role="menu" aria-label="Strobi quick menu" className="hidden sm:block fixed top-6 left-[34px] z-[80]">
              {fanItems.map((m, idx) => (
                <motion.button
                  key={m.l}
                  role="menuitem"
                  title={m.l}
                  aria-label={m.l}
                  onClick={go(m.f)}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  animate={{ opacity: 1, x: m.x, y: m.y, scale: 1 }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  transition={{ ...bouncy, delay: idx * 0.035 }}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.94 }}
                  className={`group absolute grid size-11 place-items-center rounded-full border-[1.5px] border-ink shadow-lg cursor-pointer ${m.bg}`}
                >
                  {m.i}
                  <span className="pointer-events-none absolute left-13 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-paper opacity-0 shadow-md transition group-hover:opacity-100">
                    {m.l}
                  </span>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      <button
        type="button"
        aria-label={`Strobi the study guide, feeling ${mood}. Open quick menu`}
        aria-expanded={menuOpen}
        onClick={() => { poke(); setMood("happy", 1800); setMenu(!menuOpen); }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+22px)] left-1/2 z-50 size-[68px] -translate-x-1/2 cursor-pointer rounded-full transition-transform hover:scale-105 sm:hidden"
      >
        <Fallback />
      </button>
    </>
  );
}
