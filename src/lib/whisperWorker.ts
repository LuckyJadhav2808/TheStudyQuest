import { pipeline } from "@huggingface/transformers";

type AsrPipeline = (audio: Float32Array) => Promise<{ text: string } | Array<{ text: string }>>;

let asrPromise: Promise<AsrPipeline> | null = null;

async function getAsr(): Promise<AsrPipeline> {
  if (!asrPromise) {
    asrPromise = pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en") as unknown as Promise<AsrPipeline>;
  }
  return asrPromise;
}

self.addEventListener("message", async (ev: MessageEvent<{ id: number; audio: Float32Array }>) => {
  const { id, audio } = ev.data;
  try {
    const asr = await getAsr();
    const res = await asr(audio);
    const text = Array.isArray(res) ? res.map((r) => r.text).join(" ").trim() : res.text.trim();
    self.postMessage({ id, ok: true, text });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : "Whisper failed" });
  }
});
