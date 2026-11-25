export type ID = string;
export interface Base { id: ID; createdAt: number; updatedAt: number; deletedAt?: number | null }
export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "doing" | "done";
export interface Subtask { id: ID; title: string; done: boolean }
export interface Note extends Base { title: string; content: string; folderId?: ID | null; tags: string[]; pinned?: boolean }
export interface Folder extends Base { name: string; color: string }
export interface Task extends Base { title: string; description?: string; status: TaskStatus; priority: Priority; due?: string; tags: string[]; subtasks: Subtask[]; order: number; completedAt?: number }
export interface Habit extends Base { name: string; icon: string; color: string }
export interface HabitLog { id: ID; habitId: ID; date: string; createdAt: number; updatedAt: number; deletedAt?: number | null }
export type TopicStatus = "pending" | "in-progress" | "revised" | "mastered";
export interface Topic { id: ID; name: string; weight: number; confidence: number; revisions: number; status: TopicStatus }
export interface Unit { id: ID; name: string; topics: Topic[] }
export interface Subject { id: ID; name: string; weight: number; units: Unit[] }
export interface SyllabusTrack extends Base { name: string; examDate?: string; targetHoursPerWeek: number; subjects: Subject[] }
export interface StudyLog extends Base { date: string; slot: string; minutes: number; subject: string; trackId?: ID }
export interface TestLog extends Base { date: string; kind: "DPP" | "Topic" | "Subject" | "Mock"; name: string; score: number; total: number; weakTopics: string[] }
export interface ChecklistItem { id: ID; text: string; done: boolean }
export interface Exam extends Base { title: string; date: string; trackId?: ID | null; checklist: ChecklistItem[] }
export interface DsaProblem extends Base { key: string; title: string; sheet: string; topic: string; difficulty: "easy" | "medium" | "hard"; url: string; status: "todo" | "solved" | "review"; notes: string; solvedAt?: number }
export interface NbCell { id: ID; type: "code" | "markdown"; source: string; outputs: NbOutput[]; count?: number | null }
export interface NbOutput { kind: "stdout" | "stderr" | "error" | "image" | "result"; text?: string; data?: string }
export interface Notebook extends Base { name: string; cells: NbCell[] }
export interface CodeFile extends Base { project: "code" | "ide"; name: string; language: string; content: string }
export interface Snippet extends Base { title: string; language: string; code: string; tags: string[] }
export type ResourceKind = "link" | "pdf" | "youtube" | "drive" | "github" | "text";
export interface Resource extends Base { title: string; url: string; kind: ResourceKind; folder: string; color: string; pinned: boolean; tags: string[]; text?: string }
export interface Whiteboard extends Base { name: string; data: string }
export interface ChatMessage { role: "user" | "assistant"; content: string; at: number }
export interface ChatThread extends Base { title: string; persona: string; messages: ChatMessage[] }
export interface Pet extends Base { species: string; name: string; stage: number; hunger: number; happiness: number; energy: number; feedings: number; accessory?: string; lastTick: number; active: boolean }
export interface InventoryItem extends Base { itemId: string; qty: number; equipped: boolean }
export interface Buff extends Base { kind: string; expiresAt: number }
export interface SkillRow { id: string; unlockedAt: number; createdAt: number; updatedAt: number }
export interface TimetableBlock extends Base { day: number; start: string; end: string; title: string; room: string; professor: string; color: string }
export interface Flashcard extends Base { front: string; back: string; noteId?: ID | null; due: number; fsrs?: Record<string, unknown> }
export interface ScoreRow extends Base { game: string; score: number }
export type ThemeName = "paper" | "ink" | "lavender" | "peach";
export interface Settings {
  id: "main"; theme: ThemeName; name: string; avatarSeed: string; title: string; goal: string;
  masterVolume: number; sfxVolume: number; musicVolume: number; muted: boolean;
  flags: Record<string, boolean>; hiddenWidgets: string[]; onboarded: boolean; profileCreated: boolean;
  notifications: boolean; lastChest: number; leetcodeUser: string; focusGoalMin: number; ownedBorders: string[];
  updatedAt: number;
}
export interface Gamification {
  id: "main"; xp: number; level: number; coins: number; skillPoints: number;
  ingredients: Record<string, number>; streak: number; bestStreak: number; lastActive: string;
  focusMinutes: number; tasksDone: number; dsaSolved: number; codeRunsToday: { date: string; n: number }; arcadeToday: { date: string; coins: number };
  updatedAt: number;
}
