/// <reference lib="webworker" />
import { expose, type ProxyMarked } from "comlink";

export interface PyResult { stdout: string; stderr: string; error?: string; images: string[]; value?: string }
interface PyodideLike {
  runPythonAsync: (code: string) => Promise<unknown>;
  runPython: (code: string) => unknown;
  loadPackagesFromImports: (code: string) => Promise<void>;
  setStdout: (o: { batched: (s: string) => void }) => void;
  setStderr: (o: { batched: (s: string) => void }) => void;
  FS: { writeFile: (p: string, d: string | Uint8Array) => void; unlink: (p: string) => void };
}
const CDN = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
let py: PyodideLike | null = null;

const FIGS = `
import sys, io, base64
def __sq_figs():
    if 'matplotlib.pyplot' not in sys.modules:
        return []
    import matplotlib.pyplot as plt
    out = []
    for n in plt.get_fignums():
        b = io.BytesIO()
        plt.figure(n).savefig(b, format='png', bbox_inches='tight')
        out.append(base64.b64encode(b.getvalue()).decode())
    plt.close('all')
    return out
`;
const api = {
  async init(onProgress?: ((msg: string) => void) & ProxyMarked): Promise<void> {
    if (py) return;
    onProgress?.("Downloading Python runtime");
    const url = CDN + "pyodide.mjs";
    const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as { loadPyodide: (o: { indexURL: string }) => Promise<PyodideLike> };
    py = await mod.loadPyodide({ indexURL: CDN });
    onProgress?.("Preparing environment");
    py.runPython("import os; os.environ['MPLBACKEND']='AGG'");
    py.runPython(FIGS);
    onProgress?.("Ready");
  },
  async run(code: string): Promise<PyResult> {
    if (!py) throw new Error("Python is not loaded yet");
    let stdout = "", stderr = "";
    py.setStdout({ batched: (s) => { stdout += s + "\n"; } });
    py.setStderr({ batched: (s) => { stderr += s + "\n"; } });
    const res: PyResult = { stdout: "", stderr: "", images: [] };
    try {
      await py.loadPackagesFromImports(code);
      const v = await py.runPythonAsync(code);
      if (v !== undefined && v !== null) res.value = String(v);
    } catch (e) {
      res.error = e instanceof Error ? e.message : String(e);
    }
    try {
      const figs = py.runPython("__sq_figs()") as { toJs?: () => string[]; destroy?: () => void } | string[];
      res.images = Array.isArray(figs) ? figs : figs.toJs?.() ?? [];
    } catch { /* no figures */ }
    res.stdout = stdout; res.stderr = stderr;
    return res;
  },
  async writeFile(path: string, data: string | Uint8Array): Promise<void> {
    py?.FS.writeFile(path, data);
  },
  async removeFile(path: string): Promise<void> {
    try { py?.FS.unlink(path); } catch { /* ignore missing file */ }
  },
};
export type PyWorkerApi = typeof api;
expose(api);
