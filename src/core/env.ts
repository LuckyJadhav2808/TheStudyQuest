import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

export const env = createEnv({
  server: {
    SUPABASE_URL: optional,
    SUPABASE_SECRET_KEY: optional,
    OPENROUTER_API_KEY: optional,
    GEMINI_API_KEY: optional,
    OPENAI_API_KEY: optional,
    ADMIN_EMAILS: optional,
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: optional,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optional,
    NEXT_PUBLIC_FIREBASE_API_KEY: optional,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: optional,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: optional,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: optional,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: optional,
    NEXT_PUBLIC_FIREBASE_APP_ID: optional,
  },
  runtimeEnv: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
  emptyStringAsUndefined: true,
});

export const firebaseConfigured = Boolean(
  env.NEXT_PUBLIC_FIREBASE_API_KEY && env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && env.NEXT_PUBLIC_FIREBASE_APP_ID
);
