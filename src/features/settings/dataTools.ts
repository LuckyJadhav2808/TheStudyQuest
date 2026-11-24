"use client";
import { SCHEMA_VERSION, TABLE_NAMES, db } from "@/core/db";
import { downloadBlob } from "@/lib/utils";

export async function exportBackup(): Promise<void> {
  const tables: Record<string, unknown[]> = {};
  for (const n of TABLE_NAMES) tables[n] = await db.table(n).toArray();
  downloadBlob(`studyquest-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: "studyquest", schemaVersion: SCHEMA_VERSION, exportedAt: Date.now(), tables }), "application/json");
}
export async function importBackup(text: string): Promise<void> {
  const j = JSON.parse(text) as { app?: string; schemaVersion?: number; tables?: Record<string, unknown[]> };
  if (j.app !== "studyquest" || !j.tables) throw new Error("This is not a StudyQuest backup.");
  if (j.schemaVersion !== SCHEMA_VERSION) throw new Error(`Backup schema ${j.schemaVersion} does not match app schema ${SCHEMA_VERSION}.`);
  const tables = j.tables;
  await db.transaction("rw", db.tables, async () => {
    for (const n of TABLE_NAMES) { await db.table(n).clear(); const rows = tables[n]; if (Array.isArray(rows) && rows.length) await db.table(n).bulkPut(rows); }
  });
}
export async function resetAll(): Promise<void> {
  await db.transaction("rw", db.tables, async () => { for (const n of TABLE_NAMES) await db.table(n).clear(); });
  try { localStorage.clear(); } catch { /* ignore */ }
}
