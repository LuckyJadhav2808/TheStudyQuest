"use client";
import { flushSync } from "react-dom";
import { updateSettings } from "@/core/settings";
import type { SurfaceStyle, ThemeName } from "@/core/types";

export function resolveTheme(theme: ThemeName | string | undefined): "pastel" | "obsidian" {
  if (theme === "obsidian" || theme === "ink") return "obsidian";
  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return "obsidian";
    }
    return "pastel";
  }
  return "pastel";
}

export function applyThemeAndSurface(
  theme: ThemeName | string | undefined,
  surfaceStyle: SurfaceStyle | string | undefined
) {
  if (typeof document === "undefined") return;
  const effective = resolveTheme(theme);
  const surf: SurfaceStyle = surfaceStyle === "neumorphic" ? "neumorphic" : "classic";
  document.documentElement.dataset.theme = effective;
  document.documentElement.dataset.surface = surf;

  const metaColor =
    effective === "obsidian"
      ? surf === "neumorphic"
        ? "#151518"
        : "#000000"
      : surf === "neumorphic"
      ? "#efefe9"
      : "#f6f6f4";
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", metaColor);
}

function runWithRipple(
  apply: () => void,
  event?: { clientX?: number; clientY?: number; currentTarget?: EventTarget | null }
) {
  if (typeof document === "undefined") return;
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

export function switchThemeWithRipple(
  theme: ThemeName,
  event?: { clientX?: number; clientY?: number; currentTarget?: EventTarget | null }
) {
  runWithRipple(() => {
    const surf = document.documentElement.dataset.surface;
    applyThemeAndSurface(theme, surf);
    try {
      localStorage.setItem("sq-theme", theme);
    } catch {
      /* ignore */
    }
    void updateSettings({ theme });
  }, event);
}

export function switchSurfaceWithRipple(
  surfaceStyle: SurfaceStyle,
  event?: { clientX?: number; clientY?: number; currentTarget?: EventTarget | null }
) {
  runWithRipple(() => {
    let storedTheme: string | null = null;
    try {
      storedTheme = localStorage.getItem("sq-theme");
    } catch {
      /* ignore */
    }
    applyThemeAndSurface(storedTheme ?? document.documentElement.dataset.theme, surfaceStyle);
    try {
      localStorage.setItem("sq-surface", surfaceStyle);
    } catch {
      /* ignore */
    }
    void updateSettings({ surfaceStyle });
  }, event);
}
