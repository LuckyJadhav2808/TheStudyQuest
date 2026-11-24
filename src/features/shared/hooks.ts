"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { strobiToast } from "@/features/strobi/toast";

interface Soft { id: string; deletedAt?: number | null }
interface RepoLike<T extends Soft> { active: () => Promise<T[]>; softDelete: (id: string) => Promise<void>; restore: (id: string) => Promise<void>; remove: (id: string) => Promise<void> }

/** Live list of non-deleted rows. Returns undefined while loading. */
export function useRows<T extends Soft>(repo: RepoLike<T>): T[] | undefined {
  return useLiveQuery(() => repo.active(), [], undefined);
}
/** Soft delete for 10s with an Undo toast, then hard delete. */
export async function deleteWithUndo<T extends Soft>(repo: RepoLike<T>, id: string, what: string): Promise<void> {
  await repo.softDelete(id);
  let undone = false;
  strobiToast("undo", { what }, { action: { label: "Undo", onClick: () => { undone = true; void repo.restore(id); } } });
  setTimeout(() => { if (!undone) void repo.remove(id); }, 10000);
}
