import { env, pipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

export type LocalAiMode = "summarize" | "qa" | "eli5" | "quiz";

type Text2Text = (
  text: string,
  opts?: { max_new_tokens?: number; min_length?: number }
) => Promise<Array<{ generated_text?: string; summary_text?: string }>>;

let modelPromise: Promise<Text2Text> | null = null;

async function pickDevice(): Promise<"webgpu" | "wasm"> {
  try {
    const nav = navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } };
    if (nav.gpu?.requestAdapter && (await nav.gpu.requestAdapter())) return "webgpu";
  } catch {
    /* fallback to wasm */
  }
  return "wasm";
}

async function getModel(onProgress?: (pct: number, status?: string) => void): Promise<Text2Text> {
  if (!modelPromise) {
    const files = new Map<string, { loaded: number; total: number }>();
    onProgress?.(1, "Connecting to HuggingFace…");
    const progress_callback = (info: unknown) => {
      const rec = info as { status?: string; file?: string; progress?: number; loaded?: number; total?: number };
      const fileName = rec.file ? rec.file.split("/").pop() : undefined;
      if (rec.status === "initiate" || rec.status === "download") {
        onProgress?.(Math.max(2, files.size ? 5 : 2), fileName ? `Fetching ${fileName}…` : "Fetching model files…");
        return;
      }
      if (rec.status === "ready") {
        onProgress?.(98, "Warming up runtime…");
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
    };

    modelPromise = (async () => {
      const device = await pickDevice();
      try {
        return (await pipeline("text2text-generation", "Xenova/LaMini-Flan-T5-77M", {
          device,
          progress_callback,
        })) as unknown as Text2Text;
      } catch (err) {
        if (device === "webgpu") {
          onProgress?.(5, "Switching to WASM runtime…");
          return (await pipeline("text2text-generation", "Xenova/LaMini-Flan-T5-77M", {
            device: "wasm",
            progress_callback,
          })) as unknown as Text2Text;
        }
        throw err;
      }
    })().catch((err) => {
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
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

function formatPrompt(text: string, mode: LocalAiMode): string {
  if (mode === "qa") return `Answer clearly and concisely:\n\n${text}`;
  if (mode === "eli5") return `Explain this simply in plain language with a short analogy:\n\n${text}`;
  if (mode === "quiz") return `Write 3 short study quiz questions and answers for:\n\n${text}`;
  return `Summarize the following notes concisely:\n\n${text}`;
}

const pickText = (out: Array<{ generated_text?: string; summary_text?: string }>) =>
  (out[0]?.generated_text ?? out[0]?.summary_text ?? "").trim();

self.onmessage = async (event: MessageEvent<{ id: string; text: string; mode?: LocalAiMode }>) => {
  const { id, text, mode = "summarize" } = event.data;
  try {
    const run = await getModel((pct, status) => {
      self.postMessage({ id, type: "progress", progress: pct, status });
    });

    if (mode !== "summarize") {
      self.postMessage({ id, type: "progress", progress: 99, status: "Thinking…" });
      const out = await run(formatPrompt(text.slice(0, CHUNK_CHARS), mode), { max_new_tokens: 160, min_length: 15 });
      self.postMessage({ id, type: "done", summary: pickText(out) });
      return;
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      self.postMessage({ id, type: "done", summary: "" });
      return;
    }
    if (chunks.length === 1) {
      self.postMessage({ id, type: "progress", progress: 99, status: "Summarizing…" });
      const out = await run(formatPrompt(chunks[0], "summarize"), { max_new_tokens: 130, min_length: 20 });
      self.postMessage({ id, type: "done", summary: pickText(out) });
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
      const res = await run(formatPrompt(chunks[i], "summarize"), { max_new_tokens: 90, min_length: 15 });
      const part = pickText(res);
      if (part) partials.push(part);
    }

    const combined = partials.join(" ");
    if (partials.length <= 1 || combined.length <= 420) {
      self.postMessage({ id, type: "done", summary: combined });
      return;
    }

    self.postMessage({ id, type: "progress", progress: 99, status: "Combining sections…" });
    const merged = await run(formatPrompt(combined.slice(0, CHUNK_CHARS), "summarize"), { max_new_tokens: 140, min_length: 20 });
    self.postMessage({ id, type: "done", summary: pickText(merged) || combined });
  } catch (err) {
    self.postMessage({
      id,
      type: "error",
      error: err instanceof Error ? err.message : "Local Transformer failed",
    });
  }
};
