import { NextResponse } from "next/server";
import { getSessionUser, isAdminEmail, supabaseConfigured } from "@/lib/supabaseServer";

export async function GET() {
  const configured = supabaseConfigured();
  if (!configured) return NextResponse.json({ configured: false, user: null });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ configured: true, user: null });
  return NextResponse.json({
    configured: true,
    user: {
      id: user.id,
      email: user.email,
      name: (user.user_metadata?.name as string | undefined) ?? user.email?.split("@")[0] ?? "Scholar",
      isAdmin: isAdminEmail(user.email),
    },
  });
}
