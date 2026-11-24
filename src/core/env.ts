import { z } from "zod";

const optional = z.string().optional().transform((v) => (v && v.trim() ? v.trim() : undefined));
const schema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: optional,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: optional,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: optional,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: optional,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: optional,
  NEXT_PUBLIC_FIREBASE_APP_ID: optional,
  OPENROUTER_API_KEY: optional,
  GEMINI_API_KEY: optional,
  OPENAI_API_KEY: optional,
  ADMIN_EMAILS: optional,
});

// Literal references so Next can inline NEXT_PUBLIC_* on the client. Never throws.
const raw = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
};
const parsed = schema.safeParse(raw);
export const env = parsed.success ? parsed.data : ({} as z.infer<typeof schema>);
export const firebaseConfigured = Boolean(env.NEXT_PUBLIC_FIREBASE_API_KEY && env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && env.NEXT_PUBLIC_FIREBASE_APP_ID);
