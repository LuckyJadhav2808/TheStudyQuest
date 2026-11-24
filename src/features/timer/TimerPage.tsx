"use client";
import { useEffect, useState } from "react";
import { ArrowsOut, Pause, Play, ArrowCounterClockwise, ShieldCheck, Headphones, X } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, PageFrame, ProgressBar, Segmented } from "@/components/ui/misc";
import { Field, Select } from "@/components/ui/fields";
import { CHANNELS, useAmbient } from "@/lib/ambient";
import { BINAURAL, binauralActive, setBinauralVolume, startBinaural, stopBinaural, type BinauralKey } from "@/lib/binaural";
import { RadialTimer } from "./RadialTimer";
import { useTimer } from "./useTimer";
import type { TimerKind } from "./store";

const PRESETS: Record<TimerKind, number[]> = { focus: [25, 50], short: [5, 10], long: [15, 30] };

function Binaural() {
  const [key, setKey] = useState<BinauralKey>("alpha");
  const [vol, setVol] = useState(0.5);
  const [on, setOn] = useState(binauralActive());
  const toggle = () => { if (on) { stopBinaural(); setOn(false); } else { startBinaural(key, vol); setOn(true); } };
  return (
    <Card className="gap-3">
      <CardTitle sub="Raw Web Audio. Two sine tones, one per ear." right={<Headphones size={26} weight="duotone" />}>Binaural beats</CardTitle>
      <p className="tile text-xs">Headphones required. The effect needs a different tone in each ear. Keep the volume low.</p>
      <Select value={key} onChange={(v) => { setKey(v as BinauralKey); if (on) startBinaural(v as BinauralKey, vol); }} options={Object.entries(BINAURAL).map(([k, v]) => ({ value: k, label: `${v.label} · ${v.hint}` }))} />
      <label className="flex items-center gap-3 text-xs font-bold">Volume<input aria-label="Binaural volume" type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => { setVol(+e.target.value); setBinauralVolume(+e.target.value); }} className="flex-1 accent-ink" /></label>
      <button className={`btn ${on ? "btn-ink" : "btn-lime"}`} onClick={toggle}>{on ? "Fade out" : "Start tones"}</button>
    </Card>
  );
}
function Mixer() {
  const { vols, set, stopAll } = useAmbient();
  return (
    <Card className="gap-2">
      <CardTitle sub="Synthesised loops. Nothing to download." right={<button className="btn btn-sm" onClick={stopAll}>Silence</button>}>Ambient mixer</CardTitle>
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-2">
        {CHANNELS.map((c) => (
          <label key={c.id} className="flex items-center gap-3 text-sm font-bold"><span className="w-24 shrink-0">{c.label}</span>
            <input aria-label={`${c.label} volume`} type="range" min={0} max={1} step={0.05} value={vols[c.id]} onChange={(e) => set(c.id, +e.target.value)} className="min-w-0 flex-1 accent-ink" />
          </label>
        ))}
      </div>
    </Card>
  );
}
export function TimerPage() {
  const t = useTimer();
  const [zen, setZen] = useState(false);
  const [custom, setCustom] = useState("");
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code === "Space" && !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(el.tagName)) { e.preventDefault(); if (t.running) t.pause(); else t.start(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const enterZen = () => { setZen(true); void document.documentElement.requestFullscreen?.().catch(() => undefined); };
  const exitZen = () => { setZen(false); if (document.fullscreenElement) void document.exitFullscreen(); };
  const label = t.kind === "focus" ? "Focus" : t.kind === "short" ? "Short break" : "Long break";
  const main = (
    <Card className="items-center justify-between gap-3 overflow-y-auto">
      <Segmented<TimerKind> value={t.kind} onChange={t.setKind} options={[{ value: "focus", label: "Focus" }, { value: "short", label: "Short" }, { value: "long", label: "Long" }]} />
      <RadialTimer pct={t.pct} rem={t.rem} label={label} size={248} />
      <div className="flex items-center gap-2">
        <button className="btn btn-lime min-w-32" onClick={t.running ? t.pause : t.start}>{t.running ? <><Pause weight="fill" size={18} />Pause</> : <><Play weight="fill" size={18} />Start</>}</button>
        <button className="btn btn-icon" aria-label="Reset timer" onClick={t.reset}><ArrowCounterClockwise size={20} weight="bold" /></button>
        <button className="btn btn-icon" aria-label="Zen mode" onClick={enterZen}><ArrowsOut size={20} weight="bold" /></button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PRESETS[t.kind].map((m) => <button key={m} className={`chip ${t.mins[t.kind] === m ? "bg-ink text-paper" : ""}`} onClick={() => t.setMins(t.kind, m)}>{m} min</button>)}
        <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); const n = Math.min(240, Math.max(1, Number(custom))); if (n) t.setMins(t.kind, n); setCustom(""); }}>
          <input className="input !min-h-8 w-24 !px-3 text-xs" inputMode="numeric" placeholder="Custom" aria-label="Custom minutes" value={custom} onChange={(e) => setCustom(e.target.value)} />
        </form>
      </div>
      <input className="input max-w-xs" placeholder="Subject (optional)" aria-label="Subject" value={t.subject} onChange={(e) => t.setSubject(e.target.value)} />
    </Card>
  );
  const defense = (
    <div className="flex min-h-0 flex-col gap-4 [&>*]:min-h-0">
      <Card className="gap-3">
        <CardTitle sub="Leave the tab mid-focus and the shield cracks." right={<ShieldCheck size={26} weight="duotone" />}>Focus defense</CardTitle>
        <p className="font-display num text-4xl">{Math.round(t.shield)}%</p>
        <ProgressBar pct={t.shield / 100} color={t.shield > 50 ? "var(--color-teal)" : "var(--color-orange)"} />
      </Card>
      <Binaural />
    </div>
  );
  return (
    <PageFrame title="Focus" subtitle="Timers that survive reloads, with sound to match.">
      <Panels className="lg:grid-cols-12 lg:grid-rows-1 sm:grid-cols-2" panels={[
        { id: "timer", label: "Timer", className: "lg:col-span-5 sm:col-span-2", node: main },
        { id: "defense", label: "Defense", className: "lg:col-span-4", node: defense },
        { id: "mixer", label: "Ambient", className: "lg:col-span-3", node: <Mixer /> },
      ]} />
      {zen && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-ink text-paper" role="dialog" aria-label="Zen mode">
          <button className="btn btn-icon absolute right-6 top-6 border-paper/30 text-paper" aria-label="Exit zen mode" onClick={exitZen}><X size={22} weight="bold" /></button>
          <div className="flex flex-col items-center gap-6">
            <div className="font-display num text-[22vw] leading-none sm:text-[16vw]">{String(Math.floor(Math.ceil(t.rem / 1000) / 60)).padStart(2, "0")}:{String(Math.ceil(t.rem / 1000) % 60).padStart(2, "0")}</div>
            <button className="btn btn-lime min-w-40" onClick={t.running ? t.pause : t.start}>{t.running ? "Pause" : "Start"}</button>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
