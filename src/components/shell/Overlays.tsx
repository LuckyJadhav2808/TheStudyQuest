"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { StrobiFace } from "@/features/strobi/StrobiFace";
import { updateSettings, useSettings } from "@/core/settings";
import { useUI } from "./ui-store";

export const APP_VERSION = "1.0.0";
const SHORTCUTS: [string, string][] = [["Ctrl / Cmd + K", "Command palette"], ["C", "Quick add"], ["?", "Keyboard shortcuts"], ["Esc", "Close any dialog"], ["Space", "Start or pause the timer (on /timer)"]];

export function Shortcuts() {
  const { shortcuts, set } = useUI();
  return (
    <Modal open={shortcuts} onClose={() => set({ shortcuts: false })} title="Keyboard shortcuts">
      <dl className="flex flex-col gap-2">
        {SHORTCUTS.map(([k, d]) => (
          <div key={k} className="flex items-center justify-between rounded-full bg-soft px-4 py-2 text-sm"><dt className="font-bold">{d}</dt><dd><kbd className="rounded-full border border-line px-3 py-1 font-mono text-xs">{k}</kbd></dd></div>
        ))}
      </dl>
    </Modal>
  );
}
export function Changelog() {
  const { changelog, set } = useUI();
  return (
    <Modal open={changelog} onClose={() => set({ changelog: false })} title={`StudyQuest ${APP_VERSION}`}>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
        <li>First release: focus timer, quests, habits, notes, tracker, DSA sheets, notebook, pets and more.</li>
        <li>Everything runs offline. Your data stays on this device.</li>
        <li>Optional AI features use your own API key, stored locally.</li>
      </ul>
    </Modal>
  );
}
const STEPS = [
  "Hi, I'm Strobi. I'll show you around in four quick steps. You can skip any time.",
  "Everything you do earns XP and coins: focus blocks, quests, habits, notes and code runs.",
  "Press C to quick-add anything, and Ctrl+K to jump anywhere. The rail on the left groups every page.",
  "Your data never leaves this device unless you export it. Back it up from Settings whenever you like.",
];
export function Onboarding() {
  const s = useSettings();
  const [i, setI] = useState(0);
  const [ready] = useState(true);
  if (s.onboarded || !s.profileCreated || !ready || s.updatedAt === 0) return null;
  const done = () => void updateSettings({ onboarded: true });
  return (
    <div role="dialog" aria-label="Welcome tour" className="pop-in fixed bottom-[104px] left-1/2 z-[70] w-[min(92vw,380px)] -translate-x-1/2 rounded-[28px] border-[1.5px] border-ink bg-white p-4 text-ink shadow-2xl sm:bottom-6 sm:left-[84px] sm:right-auto sm:translate-x-0">
      <div className="flex gap-3"><StrobiFace mood="happy" size={44} /><p className="text-sm font-semibold">{STEPS[i]}</p></div>
      <div className="mt-3 flex items-center justify-between">
        <span className="num text-xs text-muted">{i + 1} / {STEPS.length}</span>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-ghost" onClick={done}>Skip</button>
          <button className="btn btn-sm btn-lime" onClick={() => (i === STEPS.length - 1 ? done() : setI(i + 1))}>{i === STEPS.length - 1 ? "Let's go" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}
