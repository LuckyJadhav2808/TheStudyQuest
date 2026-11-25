"use client";
import { summarizeWithLocalAi } from "@/lib/localAi";
import { extractTopics, generateLocalStudyQuestion } from "@/lib/localNlp";

export class AiError extends Error {
  constructor(public code: "failed" | "offline", message: string) {
    super(message);
  }
}

const COUNTER = "sq-ai-usage";
export function aiUsage(): { calls: number; chars: number } {
  try {
    return JSON.parse(localStorage.getItem(COUNTER) ?? '{"calls":0,"chars":0}') as { calls: number; chars: number };
  } catch {
    return { calls: 0, chars: 0 };
  }
}

async function buildTransformerReply(prompt: string, onProgress?: (pct: number) => void): Promise<string> {
  const clean = prompt.trim();
  if (!clean) return "Share a topic, excerpt, or question and the local transformer will analyse it.";
  const topics = extractTopics(clean, 4);

  if (clean.length >= 100) {
    const summary = await summarizeWithLocalAi(clean, onProgress);
    const topicLine = topics.length ? `\n\n**Key concepts:** ${topics.map((t) => `\`${t}\``).join(", ")}` : "";
    return `${summary}${topicLine}`;
  }

  const question = generateLocalStudyQuestion(topics[0] ?? "this topic", clean);
  if (topics.length) {
    return `**Key concepts detected:** ${topics.join(", ")}\n\n- Focus on defining **${topics[0]}** in your own words.\n- ${question}`;
  }
  return `**Local Study Assistant:** ${question}`;
}

/** Runs on-device transformer + compromise NLP inference (no API keys required). */
export async function streamAI(
  messages: { role: "user" | "assistant"; content: string }[],
  opts: { system?: string; signal?: AbortSignal; onChunk?: (full: string) => void; onProgress?: (pct: number) => void } = {}
): Promise<string> {
  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  try {
    opts.onChunk?.("Thinking with on-device transformer...");
    const full = await buildTransformerReply(last, (pct) => {
      opts.onProgress?.(pct);
      if (pct < 100) opts.onChunk?.(`Downloading local AI… ${pct}%`);
    });
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    opts.onChunk?.(full);
    try {
      const u = aiUsage();
      localStorage.setItem(COUNTER, JSON.stringify({ calls: u.calls + 1, chars: u.chars + full.length }));
    } catch {
      /* ignore */
    }
    return full;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new AiError("failed", err instanceof Error ? err.message : "Local transformer failed.");
  }
}

export const askAI = (prompt: string, system?: string, onProgress?: (pct: number) => void): Promise<string> =>
  streamAI([{ role: "user", content: prompt }], { system, onProgress });
