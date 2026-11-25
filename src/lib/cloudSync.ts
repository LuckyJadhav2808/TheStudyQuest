"use client";
import { TABLE_NAMES, db } from "@/core/db";

const LAST_SYNC_KEY = "sq-last-cloud-sync";

export interface CloudUser {
  id: string;
  email?: string;
  name: string;
  isAdmin?: boolean;
}

export async function fetchCloudSession(): Promise<{ configured: boolean; user: CloudUser | null }> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return { configured: false, user: null };
    return (await res.json()) as { configured: boolean; user: CloudUser | null };
  } catch {
    return { configured: false, user: null };
  }
}

export async function syncWithCloud(): Promise<{ pushed: number; pulled: number; needsSchema?: boolean }> {
  const since = Number(localStorage.getItem(LAST_SYNC_KEY) ?? "0") || 0;
  const changes: Array<{
    table_name: string;
    row_id: string;
    updated_at: number;
    deleted_at: number | null;
    payload: Record<string, unknown>;
  }> = [];

  for (const tableName of TABLE_NAMES) {
    const rows = (await db.table(tableName).toArray()) as Array<Record<string, unknown>>;
    for (const row of rows) {
      const updatedAt = typeof row.updatedAt === "number" ? row.updatedAt : Date.now();
      const rowId = String(row.id ?? "");
      if (!rowId) continue;
      if (updatedAt > since) {
        changes.push({
          table_name: tableName,
          row_id: rowId,
          updated_at: updatedAt,
          deleted_at: typeof row.deletedAt === "number" ? row.deletedAt : null,
          payload: row,
        });
      }
    }
  }

  let pushed = 0;
  if (changes.length > 0) {
    const pushRes = await fetch("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ changes: changes.slice(0, 500) }),
    });
    if (!pushRes.ok) throw new Error("Cloud push failed");
    const pushJson = (await pushRes.json()) as { count?: number; needsSchema?: boolean };
    if (pushJson.needsSchema) return { pushed: 0, pulled: 0, needsSchema: true };
    pushed = pushJson.count ?? 0;
  }

  const pullRes = await fetch(`/api/sync?since=${since}`, { cache: "no-store" });
  if (!pullRes.ok) throw new Error("Cloud pull failed");
  const pullJson = (await pullRes.json()) as {
    needsSchema?: boolean;
    syncedAt?: number;
    rows: Array<{ table_name: string; row_id: string; updated_at: number; payload: Record<string, unknown> }>;
  };
  if (pullJson.needsSchema) return { pushed, pulled: 0, needsSchema: true };

  let pulled = 0;
  if (pullJson.rows.length > 0) {
    await db.transaction("rw", db.tables, async () => {
      for (const r of pullJson.rows) {
        if (!TABLE_NAMES.includes(r.table_name as (typeof TABLE_NAMES)[number])) continue;
        const tbl = db.table(r.table_name);
        const existing = (await tbl.get(r.row_id)) as { updatedAt?: number } | undefined;
        if (!existing || (existing.updatedAt ?? 0) < r.updated_at) {
          await tbl.put(r.payload);
          pulled += 1;
        }
      }
    });
  }

  localStorage.setItem(LAST_SYNC_KEY, String(pullJson.syncedAt ?? Date.now()));
  return { pushed, pulled };
}
