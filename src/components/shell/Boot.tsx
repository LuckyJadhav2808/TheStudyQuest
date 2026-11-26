"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Toaster } from "sonner";
import { startEngine } from "@/core/engine";
import { emit } from "@/core/events";
import { ensureProfile, useGame, useSettings } from "@/core/settings";
import { audioPrefs } from "@/lib/audio";
import { useStrobi } from "@/features/strobi/store";
import { useIsMobile } from "@/components/ui/useMedia";
import { todayKey } from "@/lib/utils";
import { hydrateSyncQueue, syncWithCloud, useSyncQueue } from "@/lib/cloudSync";
import { strobiSay } from "@/features/strobi/toast";
import { startDesktopTour } from "@/lib/tour";
import { initWebVitals } from "@/lib/vitals";
import { useUI, type QuickKind } from "./ui-store";

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || Boolean(t.closest(".cm-editor")));

export function Boot() {
  const s = useSettings();
  const g = useGame();
  const mobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const set = useUI((x) => x.set);

  useEffect(() => {
    if (s.updatedAt > 0 && !s.profileCreated && pathname !== "/login" && pathname !== "/privacy") {
      router.replace("/login");
    }
  }, [s.updatedAt, s.profileCreated, pathname, router]);

  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      set({ palette: !useUI.getState().palette });
    },
    { enableOnFormTags: true, enableOnContentEditable: true }
  );

  useHotkeys("c", (e) => {
    if (typing(e.target)) return;
    e.preventDefault();
    set({ quickAdd: "task" as QuickKind });
  });

  useHotkeys("shift+/", (e) => {
    if (typing(e.target)) return;
    set({ shortcuts: true });
  });

  useEffect(() => {
    void ensureProfile();
    startEngine();
    initWebVitals();
    try {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        if (process.env.NODE_ENV === "production") {
          void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
        } else {
          const hadController = Boolean(navigator.serviceWorker.controller);
          void navigator.serviceWorker.getRegistrations().then(async (regs) => {
            if (regs.length > 0) {
              await Promise.all(regs.map((r) => r.unregister()));
              if ("caches" in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k)));
              }
              if (hadController) window.location.reload();
            }
          });
        }
      }
    } catch {
      /* optional */
    }
    set({ online: navigator.onLine });
    hydrateSyncQueue();
    const off = () => {
      set({ online: false });
      emit("offline.entered", {});
    };
    const on = () => {
      set({ online: true });
      emit("online.restored", {});
      const hadPending = useSyncQueue.getState().pending > 0;
      void syncWithCloud()
        .then((res) => {
          if (hadPending || res.pushed > 0) {
            strobiSay(`Synced ${res.pushed || "queued"} offline change${res.pushed === 1 ? "" : "s"} to cloud!`, "tip");
          }
        })
        .catch(() => undefined);
    };
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    const touch = () => useStrobi.getState().touch();
    ["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, touch, { passive: true }));
    const idle = window.setInterval(() => {
      const st = useStrobi.getState();
      if (Date.now() - st.lastActivity > 120000 && st.mood !== "sleepy") {
        emit("idle.long", {});
        st.touch();
        useStrobi.getState().setMood("sleepy");
      }
    }, 15000);
    const tourTimer = window.setTimeout(() => {
      if (window.innerWidth >= 1024 && window.location.pathname !== "/login") startDesktopTour(false);
    }, 1400);
    return () => {
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
      window.clearInterval(idle);
      window.clearTimeout(tourTimer);
      ["pointerdown", "keydown"].forEach((ev) => window.removeEventListener(ev, touch));
    };
  }, [set]);

  useEffect(() => {
    document.documentElement.dataset.theme = s.theme;
    const surf = s.surfaceStyle ?? "classic";
    document.documentElement.dataset.surface = surf;
    try {
      localStorage.setItem("sq-theme", s.theme);
      localStorage.setItem("sq-surface", surf);
    } catch {
      /* ignore */
    }
  }, [s.theme, s.surfaceStyle]);

  useEffect(() => {
    audioPrefs.master = s.masterVolume;
    audioPrefs.sfx = s.sfxVolume;
    audioPrefs.music = s.musicVolume;
    audioPrefs.muted = s.muted;
  }, [s.masterVolume, s.sfxVolume, s.musicVolume, s.muted]);

  useEffect(() => {
    if (g.updatedAt === 0 || g.streak < 1) return;
    const t = window.setTimeout(() => {
      if (new Date().getHours() >= 20 && g.lastActive !== todayKey() && !sessionStorage.getItem("sq-risk")) {
        sessionStorage.setItem("sq-risk", "1");
        emit("streak.at_risk", {});
        if (s.notifications && "Notification" in window && Notification.permission === "granted") {
          new Notification("StudyQuest", { body: "Your streak is at risk. One small win keeps it alive." });
        }
      }
    }, 4000);
    return () => window.clearTimeout(t);
  }, [g.updatedAt, g.streak, g.lastActive, s.notifications]);

  return (
    <Toaster
      position={mobile ? "top-center" : "top-left"}
      visibleToasts={2}
      offset={mobile ? 12 : { top: 22, left: 96 }}
      mobileOffset={{ top: 12 }}
    />
  );
}
