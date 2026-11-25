import { NextResponse } from "next/server";
import { z } from "zod";
import { TABLE_NAMES } from "@/core/db";
import { getSessionUser, getSupabaseAdmin } from "@/lib/supabaseServer";

const VALID_TABLES = new Set<string>(TABLE_NAMES);

const SyncPushSchema = z.object({
  changes: z.array(
    z.object({
      table_name: z.string().refine((t) => VALID_TABLES.has(t), "Invalid table"),
      row_id: z.string().min(1).max(200),
      updated_at: z.number(),
      deleted_at: z.number().nullable().optional(),
      payload: z.record(z.string(), z.unknown()),
    })
  ).max(500),
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const since = Number(searchParams.get("since") ?? 0) || 0;

  const { data, error } = await sb
    .from("sq_sync")
    .select("table_name, row_id, updated_at, deleted_at, payload")
    .eq("user_id", user.id)
    .gt("updated_at", since)
    .order("updated_at", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.message.includes("sq_sync")) {
      return NextResponse.json({ needsSchema: true, rows: [] }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [], syncedAt: Date.now() });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  let body: z.infer<typeof SyncPushSchema>;
  try {
    body = SyncPushSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0]?.message ?? "Invalid sync payload" : "Invalid JSON" },
      { status: 400 }
    );
  }

  if (body.changes.length === 0) return NextResponse.json({ ok: true, count: 0 });

  const rows = body.changes.map((c) => ({
    user_id: user.id,
    table_name: c.table_name,
    row_id: c.row_id,
    updated_at: c.updated_at,
    deleted_at: c.deleted_at ?? null,
    payload: c.payload,
  }));

  const { error } = await sb.from("sq_sync").upsert(rows, { onConflict: "user_id,table_name,row_id" });
  if (error) {
    if (error.code === "42P01" || error.message.includes("sq_sync")) {
      return NextResponse.json({ needsSchema: true, count: 0 }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count: rows.length, syncedAt: Date.now() });
}
