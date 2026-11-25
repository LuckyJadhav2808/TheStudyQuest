"use client";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./whisperWorker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (ev: MessageEvent<{ id: number; ok: boolean; text?: string; error?: string }>) => {
      const p = pending.get(ev.data.id);
      if (!p) return;
      pending.delete(ev.data.id);
      if (ev.data.ok) p.resolve(ev.data.text ?? "");
      else p.reject(new Error(ev.data.error ?? "Whisper transcription failed"));
    };
  }
  return worker;
}

export async function transcribeBlobWithWhisper(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const decoded = await ctx.decodeAudioData(buf);
    const channel = decoded.getChannelData(0);
    const audio = new Float32Array(channel);
    const id = ++seq;
    return await new Promise<string>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ensureWorker().postMessage({ id, audio }, [audio.buffer]);
    });
  } finally {
    await ctx.close().catch(() => undefined);
  }
}
