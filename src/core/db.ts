import Dexie, { type EntityTable } from "dexie";
import type * as T from "./types";

export const SCHEMA_VERSION = 1;

export class StudyQuestDB extends Dexie {
  notes!: EntityTable<T.Note, "id">;
  folders!: EntityTable<T.Folder, "id">;
  tasks!: EntityTable<T.Task, "id">;
  habits!: EntityTable<T.Habit, "id">;
  habitLogs!: EntityTable<T.HabitLog, "id">;
  syllabusTracks!: EntityTable<T.SyllabusTrack, "id">;
  studyLogs!: EntityTable<T.StudyLog, "id">;
  testLogs!: EntityTable<T.TestLog, "id">;
  exams!: EntityTable<T.Exam, "id">;
  dsaProblems!: EntityTable<T.DsaProblem, "id">;
  notebooks!: EntityTable<T.Notebook, "id">;
  codeFiles!: EntityTable<T.CodeFile, "id">;
  snippets!: EntityTable<T.Snippet, "id">;
  resources!: EntityTable<T.Resource, "id">;
  whiteboards!: EntityTable<T.Whiteboard, "id">;
  chatThreads!: EntityTable<T.ChatThread, "id">;
  pets!: EntityTable<T.Pet, "id">;
  inventory!: EntityTable<T.InventoryItem, "id">;
  buffs!: EntityTable<T.Buff, "id">;
  skills!: EntityTable<T.SkillRow, "id">;
  timetable!: EntityTable<T.TimetableBlock, "id">;
  settings!: EntityTable<T.Settings, "id">;
  gamification!: EntityTable<T.Gamification, "id">;
  flashcards!: EntityTable<T.Flashcard, "id">;
  scores!: EntityTable<T.ScoreRow, "id">;

  constructor() {
    super("studyquest");
    this.version(1).stores({
      notes: "id, folderId, updatedAt, pinned",
      folders: "id",
      tasks: "id, status, due, order",
      habits: "id",
      habitLogs: "id, habitId, date",
      syllabusTracks: "id",
      studyLogs: "id, date",
      testLogs: "id, date",
      exams: "id, date",
      dsaProblems: "id, &key, sheet, status",
      notebooks: "id",
      codeFiles: "id, project",
      snippets: "id, language",
      resources: "id, folder, pinned",
      whiteboards: "id",
      chatThreads: "id, updatedAt",
      pets: "id",
      inventory: "id, &itemId",
      buffs: "id, expiresAt",
      skills: "id",
      timetable: "id, day",
      settings: "id",
      gamification: "id",
      flashcards: "id, due",
      scores: "id, game",
    });
  }
}

export const db = new StudyQuestDB();
export const TABLE_NAMES = [
  "notes","folders","tasks","habits","habitLogs","syllabusTracks","studyLogs","testLogs","exams","dsaProblems","notebooks","codeFiles","snippets","resources","whiteboards","chatThreads","pets","inventory","buffs","skills","timetable","settings","gamification","flashcards","scores",
] as const;
