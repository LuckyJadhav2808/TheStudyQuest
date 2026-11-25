import { env, pipeline } from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

type AsrPipeline = (audio: Float32Array) => Promise<{ text: string } | Array<{ text: string }>>;

let asrPromise: Promise<AsrPipeline> | null = null;

async function pickDevice(): Promise<"webgpu" | "wasm"> {
  try {
    const nav = navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } };
    if (nav.gpu?.requestAdapter && (await nav.gpu.requestAdapter())) return "webgpu";
  } catch {
    /* fallback to wasm */
  }
  return "wasm";
}

async function getAsr(): Promise<AsrPipeline> {
  if (!asrPromise) {
    asrPromise = (async () => {
      const device = await pickDevice();
      try {
        return (await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
          device,
        })) as unknown as AsrPipeline;
      } catch (err) {
        if (device === "webgpu") {
          return (await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
            device: "wasm",
          })) as unknown as AsrPipeline;
        }
        throw err;
      }
    })().catch((err) => {
      asrPromise = null;
      throw err;
    });
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
