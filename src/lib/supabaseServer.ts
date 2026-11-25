import { createServerClient } from "@supabase/ssr";
import { createClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sq_session";
export const REFRESH_COOKIE = "sq_refresh";

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

export async function createSupabaseSSRClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          /* called in Server Component */
        }
      },
    },
  });
}

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getSessionUser(): Promise<User | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (!error && data.user) return data.user;

  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  const { data: refreshed } = await sb.auth.refreshSession({ refresh_token: refresh });
  if (refreshed.session && refreshed.user) {
    jar.set(SESSION_COOKIE, refreshed.session.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    jar.set(REFRESH_COOKIE, refreshed.session.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return refreshed.user;
  }
  return null;
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
