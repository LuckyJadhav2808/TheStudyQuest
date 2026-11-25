"use client";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_KEY = "sq-desktop-tour-done";

export function startDesktopTour(force = false) {
  if (typeof window === "undefined") return;
  if (!force && localStorage.getItem(TOUR_KEY) === "1") return;

  const d = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    onDestroyed: () => {
      try {
        localStorage.setItem(TOUR_KEY, "1");
      } catch {
        /* ignore */
      }
    },
    steps: [
      {
        popover: {
          title: "Welcome to StudyQuest",
          description: "Your offline-first study OS for notes, spaced repetition, focus sprints, and coding.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: '[data-tour="command-palette"]',
        popover: {
          title: "Command Palette (Ctrl+K)",
          description: "Jump to any page, start a timer, or trigger quick actions from anywhere.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: '[data-tour="quick-add"]',
        popover: {
          title: "Quick Capture (C)",
          description: "Add tasks with natural language like 'Revise OS tomorrow urgent'.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: '[data-tour="xp-chip"]',
        popover: {
          title: "XP, Streaks & Coins",
          description: "Every completed note, quiz, and focus session levels up your scholar profile.",
          side: "bottom",
          align: "end",
        },
      },
    ],
  });

  d.drive();
}
