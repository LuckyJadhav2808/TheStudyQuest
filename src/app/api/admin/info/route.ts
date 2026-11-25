import { env } from "@/core/env";
import { supabaseConfigured } from "@/lib/supabaseServer";

export async function GET(): Promise<Response> {
  return Response.json({
    adminConfigured: Boolean(env.ADMIN_EMAILS),
    keys: { openrouter: Boolean(env.OPENROUTER_API_KEY), openai: Boolean(env.OPENAI_API_KEY), gemini: Boolean(env.GEMINI_API_KEY) },
    firebase: Boolean(env.NEXT_PUBLIC_FIREBASE_API_KEY),
    supabase: supabaseConfigured(),
  });
}
