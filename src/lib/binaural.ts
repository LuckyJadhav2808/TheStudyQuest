"use client";
import { audioPrefs, getCtx } from "./audio";

export const BINAURAL = {
  alpha: { label: "Alpha 10Hz", hint: "Relaxed focus", left: 200, right: 210 },
  beta: { label: "Beta 20Hz", hint: "Alert thinking", left: 200, right: 220 },
  theta: { label: "Theta 6Hz", hint: "Creative recall", left: 200, right: 206 },
  delta: { label: "Delta 2.5Hz", hint: "Deep rest", left: 200, right: 202.5 },
  gamma: { label: "Gamma 40Hz", hint: "Peak cognition", left: 200, right: 240 },
} as const;
export type BinauralKey = keyof typeof BINAURAL;

let nodes: { oscs: OscillatorNode[]; gain: GainNode } | null = null;
export function startBinaural(key: BinauralKey, volume: number): void {
  stopBinaural(0);
  const ctx = getCtx();
  if (!ctx) return;
  const p = BINAURAL[key];
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  const oscs = ([[p.left, -1], [p.right, 1]] as const).map(([f, pan]) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const st = ctx.createStereoPanner();
    st.pan.value = pan;
    o.connect(st).connect(gain);
    o.start();
    return o;
  });
  gain.gain.linearRampToValueAtTime(audioPrefs.muted ? 0 : volume * audioPrefs.master * 0.3, ctx.currentTime + 2);
  nodes = { oscs, gain };
}
export function setBinauralVolume(v: number): void {
  const ctx = getCtx();
  if (nodes && ctx) nodes.gain.gain.linearRampToValueAtTime(audioPrefs.muted ? 0 : v * audioPrefs.master * 0.3, ctx.currentTime + 0.2);
}
export function stopBinaural(fade = 1.2): void {
  const ctx = getCtx();
  if (!nodes || !ctx) return;
  const { oscs, gain } = nodes;
  nodes = null;
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
  oscs.forEach((o) => o.stop(ctx.currentTime + fade + 0.05));
}
export const binauralActive = (): boolean => nodes !== null;
