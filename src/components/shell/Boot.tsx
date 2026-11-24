"use client";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { startEngine } from "@/core/engine";
import { emit } from "@/core/events";
import { ensureProfile, useGame, useSettings } from "@/core/settings";
import { audioPrefs } from "@/lib/audio";
import { useStrobi } from "@/features/strobi/store";
import { useIsMobile } from "@/components/ui/useMedia";
import { todayKey } from "@/lib/utils";
import { useUI, type QuickKind } from "./ui-store";

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || Boolean(t.closest(".cm-editor")));

export function Boot() {
  const s = useSettings();
  const g = useGame();
  const mobile = useIsMobile();
  const set = useUI((x) => x.set);

  useEffect(() => {
    void ensureProfile();
    startEngine();
    try { if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined); } catch { /* optional */ }
    set({ online: navigator.onLine });
    const off = () => { set({ online: false }); emit("offline.entered", {}); };
    const on = () => { set({ online: true }); emit("online.restored", {}); };
    window.addEventListener("offline", off); window.addEventListener("online", on);
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); set({ palette: !useUI.getState().palette }); return; }
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() === "c") { e.preventDefault(); set({ quickAdd: "task" as QuickKind }); }
      if (e.key === "?") set({ shortcuts: true });
    };
    window.addEventListener("keydown", key);
    const touch = () => useStrobi.getState().touch();
    ["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, touch, { passive: true }));
    const idle = window.setInterval(() => {
      const st = useStrobi.getState();
      if (Date.now() - st.lastActivity > 120000 && st.mood !== "sleepy") { emit("idle.long", {}); st.touch(); useStrobi.getState().setMood("sleepy"); }
    }, 15000);
    return () => { window.removeEventListener("offline", off); window.removeEventListener("online", on); window.removeEventListener("keydown", key); window.clearInterval(idle); ["pointerdown", "keydown"].forEach((ev) => window.removeEventListener(ev, touch)); };
  }, [set]);

  useEffect(() => {
    document.documentElement.dataset.theme = s.theme;
    try { localStorage.setItem("sq-theme", s.theme); } catch { /* ignore */ }
  }, [s.theme]);
  useEffect(() => {
    audioPrefs.master = s.masterVolume; audioPrefs.sfx = s.sfxVolume; audioPrefs.music = s.musicVolume; audioPrefs.muted = s.muted;
  }, [s.masterVolume, s.sfxVolume, s.musicVolume, s.muted]);
  useEffect(() => {
    if (g.updatedAt === 0 || g.streak < 1) return;
    const t = window.setTimeout(() => {
      if (new Date().getHours() >= 20 && g.lastActive !== todayKey() && !sessionStorage.getItem("sq-risk")) {
        sessionStorage.setItem("sq-risk", "1");
        emit("streak.at_risk", {});
        if (s.notifications && "Notification" in window && Notification.permission === "granted") new Notification("StudyQuest", { body: "Your streak is at risk. One small win keeps it alive." });
      }
    }, 4000);
    return () => window.clearTimeout(t);
  }, [g.updatedAt, g.streak, g.lastActive, s.notifications]);

  return <Toaster position={mobile ? "top-center" : "bottom-left"} visibleToasts={3} offset={mobile ? 12 : { bottom: 20, left: 88 }} mobileOffset={{ top: 12 }} />;
}
