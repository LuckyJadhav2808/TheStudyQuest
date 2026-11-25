import { pipeline } from "@huggingface/transformers";

type Summarizer = (
  text: string,
  opts?: { max_new_tokens?: number; min_length?: number }
) => Promise<Array<{ summary_text?: string }>>;

let summarizerPromise: Promise<Summarizer> | null = null;

async function getSummarizer(onProgress?: (pct: number) => void): Promise<Summarizer> {
  if (!summarizerPromise) {
    summarizerPromise = pipeline("summarization", "Xenova/distilbart-cnn-6-6", {
      progress_callback: (info) => {
        if ("progress" in info && typeof info.progress === "number") onProgress?.(Math.round(info.progress));
      },
    }) as unknown as Promise<Summarizer>;
  }
  return summarizerPromise;
}

self.onmessage = async (event: MessageEvent<{ id: string; text: string }>) => {
  const { id, text } = event.data;
  try {
    const run = await getSummarizer((pct) => {
      self.postMessage({ id, type: "progress", progress: pct });
    });
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
