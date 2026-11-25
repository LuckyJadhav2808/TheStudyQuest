"use client";
import type { LocalAiMode } from "./localAiWorker";

export type { LocalAiMode };

const IDLE_UNLOAD_MS = 5 * 60 * 1000;
let worker: Worker | null = null;
let activeJobs = 0;
let idleTimer: ReturnType<typeof setTimeout> | undefined;

function getWorker(): Worker {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = undefined;
  }
  if (!worker) {
    worker = new Worker(new URL("./localAiWorker.ts", import.meta.url));
  }
  return worker;
}

function scheduleUnload(): void {
  if (activeJobs > 0) return;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (activeJobs === 0 && worker) {
      worker.terminate();
      worker = null;
    }
  }, IDLE_UNLOAD_MS);
}

/** Checks CacheStorage ("transformers-cache") to see if the local model is cached offline. */
export async function isLocalAiCached(): Promise<boolean> {
  try {
    if (typeof caches === "undefined") return false;
    const cache = await caches.open("transformers-cache");
    const keys = await cache.keys();
    return keys.some((req) => /lamini|flan-t5|distilbart|onnx|xenova/i.test(req.url));
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

/** Runs quantized in-browser Transformer inference inside a lazy, auto-unloading Web Worker. */
export function runLocalAi(
  text: string,
  mode: LocalAiMode = "summarize",
  onProgress?: (pct: number, status?: string) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    activeJobs += 1;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cleanup = () => {
      w.removeEventListener("message", handle);
      w.removeEventListener("error", onErr);
      w.removeEventListener("messageerror", onErr);
      activeJobs = Math.max(0, activeJobs - 1);
      scheduleUnload();
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
    w.postMessage({ id, text, mode });
  });
}

export function summarizeWithLocalAi(
  text: string,
  onProgress?: (pct: number, status?: string) => void
): Promise<string> {
  return runLocalAi(text, "summarize", onProgress);
}
