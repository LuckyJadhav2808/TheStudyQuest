"use client";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { emit } from "@/core/events";
import { studyLogsRepo } from "@/core/repos";
import { Modal } from "@/components/ui/modal";
import { playSfx } from "@/lib/audio";
import { fmtClock, todayKey } from "@/lib/utils";
import { useStrobi } from "@/features/strobi/store";
import { useTimerStore } from "./store";
import { useTimer } from "./useTimer";
import { Timer } from "@phosphor-icons/react";

/** Always-mounted: completion watcher, tab title sync, Focus Defense, floating mini timer, session overlay. */
export function MiniTimer() {
  const path = usePathname();
  const router = useRouter();
  const t = useTimer();
  useEffect(() => { void useTimerStore.persist.rehydrate(); }, []);
  useEffect(() => {
    const i = window.setInterval(() => {
      const s = useTimerStore.getState();
      if (s.running && Date.now() >= s.endsAt) {
        const kind = s.kind, subject = s.subject;
        const m = s.finish();
        playSfx("chime");
        if (m > 0) {
          emit("pomodoro.done", { minutes: m });
          void studyLogsRepo.add({ date: todayKey(), slot: "Pomodoro", minutes: m, subject: subject || "General" });
        }
        if ("Notification" in window && Notification.permission === "granted") new Notification(kind === "focus" ? "Focus block complete" : "Break is over", { body: kind === "focus" ? "Nice work. Take a breather." : "Ready for the next block?" });
      }
      if (s.running && s.kind === "focus" && !document.hidden && s.shield < 100) s.set({ shield: Math.min(100, s.shield + 0.4) });
    }, 500);
    const vis = () => {
      const s = useTimerStore.getState();
      if (!s.running || s.kind !== "focus") return;
      if (document.hidden) { s.set({ awayAt: Date.now() }); emit("tab.left_during_focus", {}); }
      else if (s.awayAt) { const secs = (Date.now() - s.awayAt) / 1000; s.set({ awayAt: 0, shield: Math.max(0, s.shield - Math.min(60, 10 + secs * 1.5)) }); useStrobi.getState().setMood("alert"); }
    };
    document.addEventListener("visibilitychange", vis);
    return () => { window.clearInterval(i); document.removeEventListener("visibilitychange", vis); };
  }, []);
  useEffect(() => { document.title = t.running ? `${fmtClock(t.rem)} · ${t.kind === "focus" ? "Focus" : "Break"} · StudyQuest` : "StudyQuest"; }, [t.running, t.rem, t.kind]);
  const showMini = (t.running || t.rem < t.total) && path !== "/timer";
  return (
    <>
      {showMini && (
        <motion.button drag dragMomentum={false} onClick={() => router.push("/timer")} aria-label={`Timer ${fmtClock(t.rem)}. Open focus page`} className="fixed bottom-28 left-3 z-40 flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-ink bg-lime px-4 py-2 font-bold text-ink shadow-lg sm:bottom-6 sm:left-24" whileTap={{ scale: 0.95 }}>
          <Timer size={18} weight="fill" /><span className="num font-display text-lg">{fmtClock(t.rem)}</span>
        </motion.button>
      )}
      <Modal open={t.summary !== null} onClose={() => t.clearSummary()} title="Session complete">
        {t.summary && (
          <div className="flex flex-col gap-4 text-center">
            <p className="font-display num text-6xl">{t.summary.minutes}<span className="text-2xl"> min</span></p>
            <p className="text-sm text-muted">{t.summary.subject ? `Subject: ${t.summary.subject}. ` : ""}Base reward +{t.summary.xp} XP. Buffs and skills multiply it.</p>
            <button className="btn btn-lime" onClick={() => t.clearSummary()}>Nice, onward</button>
          </div>
        )}
      </Modal>
    </>
  );
}
