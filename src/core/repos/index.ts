import type { EntityTable } from "dexie";
import { db } from "../db";
import type { Base, Gamification, Settings } from "../types";
import { markPendingSync } from "@/lib/cloudSync";
import { uid, todayKey } from "@/lib/utils";

type NewOf<T extends { id: string }> = Omit<T, "id" | "createdAt" | "updatedAt"> & Partial<Pick<T, "id">>;

export function makeRepo<T extends { id: string; createdAt: number; updatedAt: number; deletedAt?: number | null }>(table: EntityTable<T, "id">) {
  return {
    table,
    async add(data: NewOf<T>): Promise<T> {
      const now = Date.now();
      const row = { ...data, id: data.id ?? uid(), createdAt: now, updatedAt: now } as unknown as T;
      await table.put(row);
      markPendingSync();
      return row;
    },
    async get(id: string): Promise<T | undefined> {
      return table.get(id as never);
    },
    async update(id: string, patch: Partial<T>): Promise<void> {
      const cur = await table.get(id as never);
      if (cur) {
        await table.put({ ...cur, ...patch, updatedAt: Date.now() });
        markPendingSync();
      }
    },
    async active(): Promise<T[]> {
      return (await table.toArray()).filter((r) => !r.deletedAt);
    },
    async softDelete(id: string): Promise<void> {
      await this.update(id, { deletedAt: Date.now() } as Partial<T>);
    },
    async restore(id: string): Promise<void> {
      await this.update(id, { deletedAt: null } as Partial<T>);
    },
    async remove(id: string): Promise<void> {
      await table.delete(id as never);
    },
    async clear(): Promise<void> {
      await table.clear();
    },
  };
}

export const notesRepo = makeRepo(db.notes);
export const foldersRepo = makeRepo(db.folders);
export const tasksRepo = makeRepo(db.tasks);
export const habitsRepo = makeRepo(db.habits);
export const habitLogsRepo = makeRepo(db.habitLogs);
export const tracksRepo = makeRepo(db.syllabusTracks);
export const studyLogsRepo = makeRepo(db.studyLogs);
export const testLogsRepo = makeRepo(db.testLogs);
export const examsRepo = makeRepo(db.exams);
export const dsaRepo = makeRepo(db.dsaProblems);
export const notebooksRepo = makeRepo(db.notebooks);
export const codeFilesRepo = makeRepo(db.codeFiles);
export const snippetsRepo = makeRepo(db.snippets);
export const resourcesRepo = makeRepo(db.resources);
export const whiteboardsRepo = makeRepo(db.whiteboards);
export const chatRepo = makeRepo(db.chatThreads);
export const petsRepo = makeRepo(db.pets);
export const inventoryRepo = makeRepo(db.inventory);
export const buffsRepo = makeRepo(db.buffs);
export const timetableRepo = makeRepo(db.timetable);
export const flashcardsRepo = makeRepo(db.flashcards);
export const scoresRepo = makeRepo(db.scores);
export type { Base };

export const skillsRepo = {
  async unlock(id: string): Promise<void> {
    const now = Date.now();
    await db.skills.put({ id, unlockedAt: now, createdAt: now, updatedAt: now });
  },
};

export const DEFAULT_SETTINGS: Settings = {
  id: "main", theme: "pastel", surfaceStyle: "classic", name: "Scholar", avatarSeed: "strobi", title: "Rookie Scholar", goal: "Ace my exams",
  masterVolume: 0.7, sfxVolume: 0.6, musicVolume: 0.5, muted: false,
  flags: {}, hiddenWidgets: [], onboarded: false, profileCreated: false, notifications: false,
  lastChest: 0, leetcodeUser: "", focusGoalMin: 120, ownedBorders: [], updatedAt: 0,
};

export const DEFAULT_GAME: Gamification = {
  id: "main", xp: 0, level: 0, coins: 50, skillPoints: 0,
  ingredients: { stardust: 1, phoenix: 0, elixir: 0, crystal: 0, goldleaf: 0 },
  streak: 0, bestStreak: 0, lastActive: "", focusMinutes: 0, tasksDone: 0, dsaSolved: 0,
  codeRunsToday: { date: todayKey(), n: 0 }, arcadeToday: { date: todayKey(), coins: 0 }, updatedAt: 0,
};

export const settingsRepo = {
  async get(): Promise<Settings> {
    return (await db.settings.get("main")) ?? DEFAULT_SETTINGS;
  },
  async patch(patch: Partial<Settings>): Promise<Settings> {
    const next = { ...(await this.get()), ...patch, updatedAt: Date.now() };
    await db.settings.put(next);
    markPendingSync();
    return next;
  },
};

export const gameRepo = {
  async get(): Promise<Gamification> {
    return (await db.gamification.get("main")) ?? DEFAULT_GAME;
  },
  async mutate(fn: (g: Gamification) => Gamification): Promise<Gamification> {
    return db.transaction("rw", db.gamification, async () => {
      const cur = (await db.gamification.get("main")) ?? DEFAULT_GAME;
      const next = { ...fn(cur), id: "main" as const, updatedAt: Date.now() };
      await db.gamification.put(next);
      markPendingSync();
      return next;
    });
  },
};
