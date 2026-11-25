"use client";
import { flushSync } from "react-dom";
import { updateSettings } from "@/core/settings";
import type { ThemeName } from "@/core/types";

export function switchThemeWithRipple(
  theme: ThemeName,
  event?: { clientX?: number; clientY?: number; currentTarget?: EventTarget | null }
) {
  if (typeof document === "undefined") return;

  const apply = () => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("sq-theme", theme);
    } catch {
      /* ignore */
    }
    void updateSettings({ theme });
  };

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const startVT = (document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } })
    .startViewTransition;

  if (!startVT || reduced) {
    apply();
    return;
  }

  let x = window.innerWidth - 48;
  let y = 32;
  if (event && typeof event.clientX === "number" && typeof event.clientY === "number" && (event.clientX > 0 || event.clientY > 0)) {
    x = event.clientX;
    y = event.clientY;
  } else if (event?.currentTarget instanceof HTMLElement) {
    const r = event.currentTarget.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  }

  const maxR = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transition = startVT.call(document, () => {
    flushSync(apply);
  });

  void transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxR}px at ${x}px ${y}px)`],
      },
      {
        duration: 500,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  });
}
