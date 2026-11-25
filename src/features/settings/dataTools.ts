"use client";
import { z } from "zod";
import { SCHEMA_VERSION, TABLE_NAMES, db } from "@/core/db";
import { downloadBlob } from "@/lib/utils";

const BackupSchema = z.object({
  app: z.literal("studyquest"),
  schemaVersion: z.number().int(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export async function exportBackup(): Promise<void> {
  const tables: Record<string, unknown[]> = {};
  for (const n of TABLE_NAMES) tables[n] = await db.table(n).toArray();
  downloadBlob(`studyquest-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: "studyquest", schemaVersion: SCHEMA_VERSION, exportedAt: Date.now(), tables }), "application/json");
}
export async function importBackup(text: string): Promise<void> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }
  const parsed = BackupSchema.safeParse(raw);
  if (!parsed.success) throw new Error("This is not a valid StudyQuest backup.");
  const j = parsed.data;
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
