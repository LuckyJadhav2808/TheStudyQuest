"use client";

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./localAiWorker.ts", import.meta.url));
  }
  return worker;
}

/** Checks CacheStorage ("transformers-cache") to see if the local model is cached offline. */
export async function isLocalAiCached(): Promise<boolean> {
  try {
    if (typeof caches === "undefined") return false;
    const cache = await caches.open("transformers-cache");
    const keys = await cache.keys();
    return keys.some((req) => /distilbart|onnx|xenova/i.test(req.url));
  } catch {
    return false;
  }
}

/** Pre-downloads and warms up the quantized Transformer model in the Web Worker. */
export async function preloadLocalAi(onProgress?: (pct: number, status?: string) => void): Promise<void> {
  await summarizeWithLocalAi(
    "StudyQuest runs quantized local AI models directly inside a browser Web Worker for private offline summarization.",
    onProgress
  );
}

/** Runs quantized in-browser Transformer summarization inside a lazy Web Worker. */
export function summarizeWithLocalAi(text: string, onProgress?: (pct: number, status?: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cleanup = () => {
      w.removeEventListener("message", handle);
      w.removeEventListener("error", onErr);
      w.removeEventListener("messageerror", onErr);
    };
    const onErr = (ev: Event) => {
      cleanup();
      worker?.terminate();
      worker = null;
      const msg = ev instanceof ErrorEvent && ev.message ? ev.message : "Local AI worker failed to load";
      reject(new Error(msg));
    };
    const handle = (
      e: MessageEvent<{ id: string; type: string; progress?: number; status?: string; summary?: string; error?: string }>
    ) => {
      if (e.data.id !== id) return;
      if (e.data.type === "progress" && typeof e.data.progress === "number") {
        onProgress?.(e.data.progress, e.data.status);
      } else if (e.data.type === "done") {
        cleanup();
        resolve(e.data.summary ?? "");
      } else if (e.data.type === "error") {
        cleanup();
        reject(new Error(e.data.error || "Local AI error"));
      }
    };
    w.addEventListener("message", handle);
    w.addEventListener("error", onErr);
    w.addEventListener("messageerror", onErr);
    w.postMessage({ id, text });
  });
}
