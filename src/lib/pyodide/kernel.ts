"use client";
import { proxy, wrap, type Remote } from "comlink";
import { create } from "zustand";
import type { PyResult, PyWorkerApi } from "./pyodide.worker";

export type { PyResult };
interface KState { status: "idle" | "loading" | "ready" | "busy" | "error"; message: string }
export const useKernel = create<KState>(() => ({ status: "idle", message: "" }));

let worker: Worker | null = null;
let api: Remote<PyWorkerApi> | null = null;
let booting: Promise<void> | null = null;

export function bootKernel(): Promise<void> {
  if (booting) return booting;
  useKernel.setState({ status: "loading", message: "Starting worker" });
  worker = new Worker(new URL("./pyodide.worker.ts", import.meta.url));
  api = wrap<PyWorkerApi>(worker);
  booting = api
    .init(proxy((m: string) => useKernel.setState({ message: m })))
    .then(() => useKernel.setState({ status: "ready", message: "Python ready" }))
    .catch((e: unknown) => { booting = null; useKernel.setState({ status: "error", message: e instanceof Error ? e.message : "Failed to load Python" }); throw e; });
  return booting;
}
export async function runPython(code: string): Promise<PyResult> {
  await bootKernel();
  if (!api) throw new Error("Kernel unavailable");
  useKernel.setState({ status: "busy", message: "Running" });
  try { return await api.run(code); } finally { if (useKernel.getState().status === "busy") useKernel.setState({ status: "ready", message: "Python ready" }); }
}
export async function writePyFile(path: string, text: string): Promise<void> {
  await bootKernel();
  await api?.writeFile(path, text);
}
/** Interrupt = terminate the worker. State is lost, like restarting a kernel. */
export function restartKernel(): void {
  worker?.terminate();
  worker = null; api = null; booting = null;
  useKernel.setState({ status: "idle", message: "Kernel restarted" });
}
