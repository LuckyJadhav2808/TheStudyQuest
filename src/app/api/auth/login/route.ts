import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin, REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/supabaseServer";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  mode: z.enum(["signin", "signup"]).default("signin"),
  name: z.string().max(60).optional(),
});

const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many login attempts. Please wait a minute." }, { status: 429 });
  }
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0]?.message ?? "Invalid input" : "Invalid JSON" },
      { status: 400 }
    );
  }

  let session = null;
  let user = null;

  if (body.mode === "signup") {
    const { data, error } = await sb.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name?.trim() || body.email.split("@")[0] },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    user = data.user;
    const signInRes = await sb.auth.signInWithPassword({ email: body.email, password: body.password });
    if (signInRes.error || !signInRes.data.session) {
      return NextResponse.json({ error: signInRes.error?.message ?? "Created account, sign in failed" }, { status: 400 });
    }
    session = signInRes.data.session;
  } else {
    const { data, error } = await sb.auth.signInWithPassword({ email: body.email, password: body.password });
    if (error || !data.session) {
      return NextResponse.json({ error: error?.message ?? "Invalid email or password" }, { status: 401 });
    }
    session = data.session;
    user = data.user;
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  jar.set(REFRESH_COOKIE, session.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({
    user: {
      id: user?.id,
      email: user?.email,
      name: (user?.user_metadata?.name as string | undefined) ?? user?.email?.split("@")[0] ?? "Scholar",
    },
  });
}
