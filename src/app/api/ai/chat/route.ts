import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { z } from "zod";
import { env } from "@/core/env";

export const maxDuration = 60;
const body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).min(1),
  system: z.string().optional(),
  provider: z.enum(["openrouter", "openai", "google"]).default("openrouter"),
  model: z.string().min(1).default("google/gemini-2.0-flash-001"),
});

export async function POST(req: Request): Promise<Response> {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad-request" }, { status: 400 });
  const { messages, system, provider, model } = parsed.data;
  const userKey = req.headers.get("x-user-key")?.trim();
  const serverKey = provider === "openrouter" ? env.OPENROUTER_API_KEY : provider === "openai" ? env.OPENAI_API_KEY : env.GEMINI_API_KEY;
  const apiKey = userKey || serverKey;
  if (!apiKey) return Response.json({ error: "no-key" }, { status: 401 });
  try {
    const languageModel =
      provider === "google"
        ? createGoogleGenerativeAI({ apiKey })(model)
        : createOpenAI({ apiKey, baseURL: provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined }).chat(model);
    const result = streamText({ model: languageModel, system, messages: messages as ModelMessage[] });
    return result.toTextStreamResponse();
  } catch {
    return Response.json({ error: "provider-failed" }, { status: 502 });
  }
}
