import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/supabaseServer";

export async function POST() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(REFRESH_COOKIE);
  return NextResponse.json({ ok: true });
}
