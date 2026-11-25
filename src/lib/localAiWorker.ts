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
      pipeline("summarization", "Xenova/LaMini-Flan-T5-77M", {
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

const CHUNK_CHARS = 1600;
const MAX_CHUNKS = 8;

function chunkText(input: string, maxChars = CHUNK_CHARS): string[] {
  const clean = input.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let buf = "";

  for (const s of sentences) {
    if (s.length > maxChars) {
      if (buf) {
        chunks.push(buf);
        buf = "";
      }
      for (let i = 0; i < s.length && chunks.length < MAX_CHUNKS; i += maxChars) {
        chunks.push(s.slice(i, i + maxChars));
      }
      continue;
    }
    if ((buf ? buf.length + 1 : 0) + s.length > maxChars) {
      chunks.push(buf);
      buf = s;
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
    if (chunks.length >= MAX_CHUNKS) break;
  }
  if (buf && chunks.length < MAX_CHUNKS) chunks.push(buf);
  return chunks;
}

self.onmessage = async (event: MessageEvent<{ id: string; text: string }>) => {
  const { id, text } = event.data;
  try {
    const run = await getSummarizer((pct, status) => {
      self.postMessage({ id, type: "progress", progress: pct, status });
    });
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      self.postMessage({ id, type: "done", summary: "" });
      return;
    }
    if (chunks.length === 1) {
      self.postMessage({ id, type: "progress", progress: 99, status: "Summarizing…" });
      const out = await run(chunks[0], { max_new_tokens: 130, min_length: 25 });
      self.postMessage({ id, type: "done", summary: out[0]?.summary_text ?? "" });
      return;
    }

    const partials: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      self.postMessage({
        id,
        type: "progress",
        progress: Math.min(98, 90 + Math.round(((i + 1) / (chunks.length + 1)) * 9)),
        status: `Summarizing section ${i + 1}/${chunks.length}…`,
      });
      const res = await run(chunks[i], { max_new_tokens: 90, min_length: 15 });
      const part = res[0]?.summary_text?.trim();
      if (part) partials.push(part);
    }

    const combined = partials.join(" ");
    if (partials.length <= 1 || combined.length <= 420) {
      self.postMessage({ id, type: "done", summary: combined });
      return;
    }

    self.postMessage({ id, type: "progress", progress: 99, status: "Combining sections…" });
    const merged = await run(combined.slice(0, CHUNK_CHARS), { max_new_tokens: 140, min_length: 25 });
    self.postMessage({ id, type: "done", summary: merged[0]?.summary_text ?? combined });
  } catch (err) {
    self.postMessage({
      id,
      type: "error",
      error: err instanceof Error ? err.message : "Local Transformer failed",
    });
  }
};
