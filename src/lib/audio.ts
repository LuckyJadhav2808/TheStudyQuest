"use client";
export type SfxKind = "xp" | "level" | "coin" | "streak" | "warn" | "tip" | "error" | "click" | "chime";
export const audioPrefs = { master: 0.7, sfx: 0.6, music: 0.5, muted: false };

let ctx: AudioContext | null = null;
export function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = ctx ?? new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}
const SEQ: Record<SfxKind, { f: number[]; t: OscillatorType; d: number }> = {
  xp: { f: [660, 880], t: "triangle", d: 0.09 },
  level: { f: [523, 659, 784, 1047], t: "triangle", d: 0.11 },
  coin: { f: [988, 1319], t: "square", d: 0.07 },
  streak: { f: [440, 554, 659], t: "triangle", d: 0.09 },
  warn: { f: [260, 200], t: "square", d: 0.12 },
  tip: { f: [784], t: "sine", d: 0.12 },
  error: { f: [160, 130], t: "sawtooth", d: 0.14 },
  click: { f: [520], t: "sine", d: 0.04 },
  chime: { f: [659, 988, 1319], t: "sine", d: 0.18 },
};
export function playSfx(kind: SfxKind): void {
  if (audioPrefs.muted) return;
  const c = getCtx();
  if (!c) return;
  const vol = audioPrefs.master * audioPrefs.sfx * 0.25;
  if (vol <= 0) return;
  const s = SEQ[kind];
  s.f.forEach((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    const t0 = c.currentTime + i * s.d;
    o.type = s.t;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + s.d + 0.08);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + s.d + 0.1);
  });
}
