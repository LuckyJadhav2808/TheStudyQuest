"use client";
import { useEffect, useState } from "react";
import { ArrowsOut, Pause, Play, ArrowCounterClockwise, ShieldCheck, Headphones, X } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageFrame, ProgressBar, Segmented } from "@/components/ui/misc";
import { Select } from "@/components/ui/fields";
import { Slider } from "@/components/ui/slider";
import { CHANNELS, useAmbient } from "@/lib/ambient";
import { BINAURAL, binauralActive, setBinauralVolume, startBinaural, stopBinaural, type BinauralKey } from "@/lib/binaural";
import { RadialTimer } from "./RadialTimer";
import { useTimer } from "./useTimer";
import type { TimerKind } from "./store";

const PRESETS: Record<TimerKind, number[]> = { focus: [25, 50], short: [5, 10], long: [15, 30] };

function SoundscapeCard() {
  const [mode, setMode] = useState<"binaural" | "ambient">("binaural");
  const [key, setKey] = useState<BinauralKey>("alpha");
  const [vol, setVol] = useState(0.5);
  const [on, setOn] = useState(binauralActive());
  const { vols, set, stopAll } = useAmbient();

  const toggle = () => {
    if (on) {
      stopBinaural();
      setOn(false);
    } else {
      startBinaural(key, vol);
      setOn(true);
    }
  };

  return (
    <BentoCard
      title="Soundscape"
      subtitle={mode === "binaural" ? "Sine tones, one per ear." : "Synthesised loops, offline."}
      action={
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "binaural", label: "Binaural" },
            { value: "ambient", label: "Ambient" },
          ]}
        />
      }
      className="h-full"
    >
      {mode === "binaural" ? (
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex items-center gap-2 rounded-2xl bg-soft px-3 py-2 text-xs text-muted">
            <Headphones size={15} className="shrink-0 text-fg" />
            <span className="truncate">Headphones required · Keep volume low</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted">Frequency preset</span>
            <Select
              ariaLabel="Binaural frequency mode"
              value={key}
              onChange={(v) => {
                setKey(v as BinauralKey);
                if (on) startBinaural(v as BinauralKey, vol);
              }}
              options={Object.entries(BINAURAL).map(([k, v]) => ({ value: k, label: `${v.label} · ${v.hint}` }))}
            />
          </div>

          <Slider
            label="Tone volume"
            showValue
            min={0}
            max={1}
            step={0.05}
            value={vol}
            onChange={(e) => {
              const v = +e.target.value;
              setVol(v);
              setBinauralVolume(v);
            }}
          />

          <button
            className={`btn ${on ? "btn-ink" : "btn-lime"} w-full font-bold`}
            onClick={toggle}
          >
            {on ? "Fade out" : "Start tones"}
          </button>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-3">
          <ScrollArea className="flex-1 min-h-0 pr-1">
            <div className="flex flex-col gap-3 pb-2">
              {CHANNELS.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-bold truncate">{c.label}</span>
                  <Slider
                    aria-label={`${c.label} volume`}
                    min={0}
                    max={1}
                    step={0.05}
                    value={vols[c.id]}
                    onChange={(e) => set(c.id, +e.target.value)}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
          <button className="btn btn-sm w-full shrink-0" onClick={stopAll}>
            Silence all
          </button>
        </div>
      )}
    </BentoCard>
  );
}

export function TimerPage() {
  const t = useTimer();
  const [zen, setZen] = useState(false);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code === "Space" && !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(el.tagName)) {
        e.preventDefault();
        if (t.running) t.pause();
        else t.start();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const enterZen = () => {
    setZen(true);
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };
  const exitZen = () => {
    setZen(false);
    if (document.fullscreenElement) void document.exitFullscreen();
  };
  const label = t.kind === "focus" ? "Focus" : t.kind === "short" ? "Short break" : "Long break";

  const main = (
    <BentoCard
      title="Focus Timer"
      action={
        <Segmented<TimerKind>
          value={t.kind}
          onChange={t.setKind}
          options={[
            { value: "focus", label: "Focus" },
            { value: "short", label: "Short" },
            { value: "long", label: "Long" },
          ]}
        />
      }
      className="h-full"
    >
      <div className="flex h-full min-h-0 w-full flex-col items-center justify-between gap-2 py-1">
        <div className="flex h-full min-h-0 flex-1 w-full items-center justify-center">
          <RadialTimer pct={t.pct} rem={t.rem} label={label} running={t.running} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            className="btn btn-lime min-w-32 py-2 font-bold shadow-xs hover:scale-105 active:scale-95 transition"
            onClick={t.running ? t.pause : t.start}
          >
            {t.running ? <><Pause weight="fill" size={18} /> Pause</> : <><Play weight="fill" size={18} /> Start</>}
          </button>
          <button className="btn btn-icon size-10" aria-label="Reset timer" onClick={t.reset}>
            <ArrowCounterClockwise size={18} weight="bold" />
          </button>
          <button className="btn btn-icon size-10" aria-label="Zen mode" onClick={enterZen}>
            <ArrowsOut size={18} weight="bold" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 shrink-0">
          {PRESETS[t.kind].map((m) => (
            <button
              key={m}
              className={`chip text-xs ${t.mins[t.kind] === m ? "bg-ink text-paper font-bold" : ""}`}
              onClick={() => t.setMins(t.kind, m)}
            >
              {m} min
            </button>
          ))}
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Math.min(240, Math.max(1, Number(custom)));
              if (n) t.setMins(t.kind, n);
              setCustom("");
            }}
          >
            <input
              className="input !min-h-8 w-20 !px-3 text-xs rounded-full border border-line bg-surface"
              inputMode="numeric"
              placeholder="Custom"
              aria-label="Custom minutes"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </form>
        </div>
      </div>
    </BentoCard>
  );

  const rightCol = (
    <div style={{ gap: "var(--gutter, 16px)" }} className="flex h-full min-h-0 flex-col">
      {/* Slim Focus Defense Status Strip */}
      <BentoCard autoHeight className="shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck size={20} weight="duotone" className="text-teal shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-extrabold leading-tight truncate">Focus defense</p>
              <p className="text-[11px] text-muted truncate">Leave tab and shield cracks</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-24 hidden sm:block">
              <ProgressBar pct={t.shield / 100} color={t.shield > 50 ? "var(--color-teal)" : "var(--color-orange)"} />
            </div>
            <span className="font-display num text-lg font-black">{Math.round(t.shield)}%</span>
          </div>
        </div>
      </BentoCard>

      <div className="flex-1 min-h-0">
        <SoundscapeCard />
      </div>
    </div>
  );

  return (
    <PageFrame title="Focus" subtitle="Timers that survive reloads, with sound to match.">
      <Panels
        className="lg:grid-cols-12 lg:grid-rows-1 sm:grid-cols-2"
        panels={[
          { id: "timer", label: "Timer", className: "lg:col-span-7 sm:col-span-1", node: main },
          { id: "sound", label: "Soundscape", className: "lg:col-span-5 sm:col-span-1", node: rightCol },
        ]}
      />
      {zen && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-ink text-paper" role="dialog" aria-label="Zen mode">
          <button className="btn btn-icon absolute right-6 top-6 border-paper/30 text-paper" aria-label="Exit zen mode" onClick={exitZen}>
            <X size={22} weight="bold" />
          </button>
          <div className="flex flex-col items-center gap-6">
            <div className="font-display num text-[22vw] leading-none sm:text-[16vw]">
              {String(Math.floor(Math.ceil(t.rem / 1000) / 60)).padStart(2, "0")}:{String(Math.ceil(t.rem / 1000) % 60).padStart(2, "0")}
            </div>
            <button className="btn btn-lime min-w-40 py-3 text-lg font-bold" onClick={t.running ? t.pause : t.start}>
              {t.running ? "Pause" : "Start"}
            </button>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
