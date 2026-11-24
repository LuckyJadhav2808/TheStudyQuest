"use client";
import { Howl } from "howler";
import { create } from "zustand";
import { audioPrefs } from "./audio";

export const CHANNELS = [
  { id: "rain", label: "Rain" }, { id: "campfire", label: "Campfire" }, { id: "cafe", label: "Cafe" }, { id: "white", label: "White noise" },
  { id: "ocean", label: "Ocean" }, { id: "forest", label: "Forest" }, { id: "wind", label: "Wind" },
] as const;
export type ChannelId = (typeof CHANNELS)[number]["id"];
const RATE = 16000, DUR = 8;

function synth(id: ChannelId): Float32Array {
  const n = RATE * DUR, out = new Float32Array(n);
  let lp1 = 0, lp2 = 0, pop = 0;
  const TAU = Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const t = i / n, w = Math.random() * 2 - 1;
    switch (id) {
      case "white": out[i] = w * 0.5; break;
      case "rain": { lp1 += (w - lp1) * 0.25; out[i] = (w - lp1) * 0.6 + (Math.random() < 0.002 ? 0.8 : 0) * w; break; }
      case "wind": { lp1 += (w - lp1) * 0.03; out[i] = lp1 * (0.6 + 0.4 * Math.sin(TAU * t * 2)) * 5; break; }
      case "ocean": { lp1 += (w - lp1) * 0.012; out[i] = lp1 * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(TAU * t * 1))) * 9; break; }
      case "campfire": { lp1 += (w - lp1) * 0.01; if (Math.random() < 0.0015) pop = 0.9 * Math.random(); pop *= 0.985; out[i] = lp1 * 3 + pop * w; break; }
      case "cafe": { lp1 += (w - lp1) * 0.2; lp2 += (w - lp2) * 0.03; out[i] = (lp1 - lp2) * (0.5 + 0.3 * Math.sin(TAU * t * 3) + 0.2 * Math.sin(TAU * t * 7)) * 1.4; break; }
      case "forest": { lp1 += (w - lp1) * 0.02; const chirp = Math.sin(TAU * 3000 * (i / RATE)) * Math.max(0, Math.sin(TAU * t * 5)) ** 20 * 0.25; out[i] = lp1 * 3 * (0.7 + 0.3 * Math.sin(TAU * t * 1)) + chirp; break; }
    }
  }
  let peak = 0.0001;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  for (let i = 0; i < n; i++) out[i] = (out[i] / peak) * 0.8;
  return out;
}
function wavUrl(samples: Float32Array): string {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true));
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
const howls = new Map<ChannelId, Howl>();
function howl(id: ChannelId): Howl {
  let h = howls.get(id);
  if (!h) { h = new Howl({ src: [wavUrl(synth(id))], format: ["wav"], loop: true, volume: 0 }); howls.set(id, h); }
  return h;
}
interface AmbientState { vols: Record<ChannelId, number>; set: (id: ChannelId, v: number) => void; stopAll: () => void; preset: (p: Partial<Record<ChannelId, number>>) => void }
const zero = Object.fromEntries(CHANNELS.map((c) => [c.id, 0])) as Record<ChannelId, number>;
function apply(id: ChannelId, v: number): void {
  const h = howl(id);
  const vol = audioPrefs.muted ? 0 : v * audioPrefs.master * audioPrefs.music;
  if (v > 0) { h.volume(vol); if (!h.playing()) h.play(); } else if (h.playing()) h.pause();
}
export const useAmbient = create<AmbientState>((set, get) => ({
  vols: zero,
  set: (id, v) => { apply(id, v); set({ vols: { ...get().vols, [id]: v } }); },
  stopAll: () => { CHANNELS.forEach((c) => apply(c.id, 0)); set({ vols: zero }); },
  preset: (p) => { const next = { ...zero, ...p }; CHANNELS.forEach((c) => apply(c.id, next[c.id])); set({ vols: next }); },
}));
