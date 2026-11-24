"use client";
import { settingsRepo } from "@/core/repos";

export class AiError extends Error {
  constructor(public code: "no-key" | "failed" | "offline", message: string) { super(message); }
}
const COUNTER = "sq-ai-usage";
export function aiUsage(): { calls: number; chars: number } {
  try { return JSON.parse(localStorage.getItem(COUNTER) ?? '{"calls":0,"chars":0}') as { calls: number; chars: number }; } catch { return { calls: 0, chars: 0 }; }
}
/** Streams a completion from /api/ai/chat. The user's key is sent per request and never stored server-side. */
export async function streamAI(messages: { role: "user" | "assistant"; content: string }[], opts: { system?: string; signal?: AbortSignal; onChunk?: (full: string) => void } = {}): Promise<string> {
  if (!navigator.onLine) throw new AiError("offline", "You are offline. AI needs a connection.");
  const s = await settingsRepo.get();
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...(s.aiKey ? { "x-user-key": s.aiKey } : {}) },
    body: JSON.stringify({ messages, system: opts.system, provider: s.aiProvider, model: s.aiModel }),
    signal: opts.signal,
  });
  if (res.status === 401) throw new AiError("no-key", "Add an API key in Settings to use AI.");
  if (!res.ok || !res.body) throw new AiError("failed", "The AI provider did not answer. Check your key and model in Settings.");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += dec.decode(value, { stream: true });
    opts.onChunk?.(full);
  }
  try { const u = aiUsage(); localStorage.setItem(COUNTER, JSON.stringify({ calls: u.calls + 1, chars: u.chars + full.length })); } catch { /* ignore */ }
  return full;
}
export const askAI = (prompt: string, system?: string): Promise<string> => streamAI([{ role: "user", content: prompt }], { system });
