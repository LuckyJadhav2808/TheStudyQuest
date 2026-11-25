"use client";
import { proxy, transfer, wrap, type Remote } from "comlink";
import { create } from "zustand";
import type { PyResult, PyWorkerApi } from "./pyodide.worker";

export type { PyResult };
interface KState { status: "idle" | "loading" | "ready" | "busy" | "error"; message: string }
export const useKernel = create<KState>(() => ({ status: "idle", message: "" }));

let worker: Worker | null = null;
let api: Remote<PyWorkerApi> | null = null;
let booting: Promise<void> | null = null;
const mountedFiles = new Map<string, string | File>();

async function pushToWorker(targetApi: Remote<PyWorkerApi>, path: string, source: string | File): Promise<void> {
  if (typeof source === "string") {
    await targetApi.writeFile(path, source);
    return;
  }
  const bytes = new Uint8Array(await source.arrayBuffer());
  await targetApi.writeFile(path, transfer(bytes, [bytes.buffer]));
}

export function bootKernel(): Promise<void> {
  if (booting) return booting;
  useKernel.setState({ status: "loading", message: "Starting worker" });
  worker = new Worker(new URL("./pyodide.worker.ts", import.meta.url));
  api = wrap<PyWorkerApi>(worker);
  const currentApi = api;
  booting = currentApi
    .init(proxy((m: string) => useKernel.setState({ message: m })))
    .then(async () => {
      for (const [path, source] of mountedFiles) {
        await pushToWorker(currentApi, path, source);
      }
      useKernel.setState({ status: "ready", message: "Python ready" });
    })
    .catch((e: unknown) => { booting = null; useKernel.setState({ status: "error", message: e instanceof Error ? e.message : "Failed to load Python" }); throw e; });
  return booting;
}
export async function runPython(code: string): Promise<PyResult> {
  await bootKernel();
  if (!api) throw new Error("Kernel unavailable");
  useKernel.setState({ status: "busy", message: "Running" });
  try { return await api.run(code); } finally { if (useKernel.getState().status === "busy") useKernel.setState({ status: "ready", message: "Python ready" }); }
}
/** Stage a dataset/text file lazily; zero-copy transferred to the worker if booted, or on first Python run. */
export async function writePyFile(path: string, data: string | File): Promise<void> {
  mountedFiles.set(path, data);
  if (api && useKernel.getState().status === "ready") {
    await pushToWorker(api, path, data);
  }
}
export async function removePyFile(path: string): Promise<void> {
  mountedFiles.delete(path);
  if (api && useKernel.getState().status === "ready") {
    await api.removeFile(path);
  }
}
/** Interrupt = terminate the worker. State is lost, like restarting a kernel. */
export function restartKernel(): void {
  worker?.terminate();
  worker = null; api = null; booting = null;
  useKernel.setState({ status: "idle", message: "Kernel restarted" });
}
