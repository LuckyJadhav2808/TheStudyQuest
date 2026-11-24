"use client";
import { env, firebaseConfigured } from "./env";

async function auth() {
  const { getApps, initializeApp } = await import("firebase/app");
  const a = await import("firebase/auth");
  const app = getApps()[0] ?? initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  return { a, auth: a.getAuth(app) };
}
/** All helpers resolve to a display name, or null when Firebase is not configured or fails. The app never depends on them. */
export async function googleSignIn(): Promise<string | null> {
  if (!firebaseConfigured) return null;
  try { const { a, auth: au } = await auth(); const r = await a.signInWithPopup(au, new a.GoogleAuthProvider()); return r.user.displayName ?? r.user.email; } catch { return null; }
}
export async function emailSignIn(email: string, password: string): Promise<string | null> {
  if (!firebaseConfigured) return null;
  try {
    const { a, auth: au } = await auth();
    try { return (await a.signInWithEmailAndPassword(au, email, password)).user.email; } catch { return (await a.createUserWithEmailAndPassword(au, email, password)).user.email; }
  } catch { return null; }
}
export { firebaseConfigured };
