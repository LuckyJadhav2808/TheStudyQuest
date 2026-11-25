import { env, pipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

type Summarizer = (
  text: string,
  opts?: { max_new_tokens?: number; min_length?: number }
) => Promise<Array<{ summary_text?: string }>>;

let summarizerPromise: Promise<Summarizer> | null = null;

async function getSummarizer(onProgress?: (pct: number, status?: string) => void): Promise<Summarizer> {
  if (!summarizerPromise) {
    const files = new Map<string, { loaded: number; total: number }>();
    onProgress?.(1, "Connecting to HuggingFace…");
    summarizerPromise = (
      pipeline("summarization", "Xenova/distilbart-cnn-6-6", {
        progress_callback: (info) => {
          const rec = info as { status?: string; file?: string; progress?: number; loaded?: number; total?: number };
          const fileName = rec.file ? rec.file.split("/").pop() : undefined;
          if (rec.status === "initiate" || rec.status === "download") {
            onProgress?.(Math.max(2, files.size ? 5 : 2), fileName ? `Fetching ${fileName}…` : "Fetching model files…");
            return;
          }
          if (rec.status === "ready") {
            onProgress?.(98, "Warming up ONNX runtime…");
            return;
          }
          if (rec.file && typeof rec.loaded === "number" && typeof rec.total === "number" && rec.total > 0) {
            files.set(rec.file, { loaded: rec.loaded, total: rec.total });
            let loaded = 0;
            let total = 0;
            for (const f of files.values()) {
              loaded += f.loaded;
              total += f.total;
            }
            const pct = total > 0 ? Math.min(97, Math.max(2, Math.round((loaded / total) * 100))) : 2;
            onProgress?.(pct, fileName ? `Downloading ${fileName}…` : "Downloading model…");
          } else if (typeof rec.progress === "number") {
            onProgress?.(Math.min(97, Math.max(2, Math.round(rec.progress))), fileName ? `Downloading ${fileName}…` : undefined);
          }
        },
      }) as unknown as Promise<Summarizer>
    ).catch((err) => {
      summarizerPromise = null;
      throw err;
    });
  }
  return summarizerPromise;
}

self.onmessage = async (event: MessageEvent<{ id: string; text: string }>) => {
  const { id, text } = event.data;
  try {
    const run = await getSummarizer((pct, status) => {
      self.postMessage({ id, type: "progress", progress: pct, status });
    });
    self.postMessage({ id, type: "progress", progress: 99, status: "Verifying model…" });
    const out = await run(text.slice(0, 3500), { max_new_tokens: 130, min_length: 25 });
    self.postMessage({ id, type: "done", summary: out[0]?.summary_text ?? "" });
  } catch (err) {
    self.postMessage({
      id,
      type: "error",
      error: err instanceof Error ? err.message : "Local Transformer failed",
    });
  }
};
