import type { Priority } from "./types";

export interface EventMap {
  "task.completed": { priority: Priority; title: string };
  "habit.checked": { name: string; streak: number };
  "pomodoro.done": { minutes: number };
  "note.created": { title: string };
  "code.ran": { lang: string };
  "dsa.solved": { difficulty: "easy" | "medium" | "hard"; title: string };
  "pet.fed": { petName: string };
  "level.up": { level: number };
  "streak.extended": { days: number };
  "streak.at_risk": Record<string, never>;
  "buff.expired": { kind: string };
  "tab.left_during_focus": Record<string, never>;
  "idle.long": Record<string, never>;
  "offline.entered": Record<string, never>;
  "online.restored": Record<string, never>;
  "saved": { what: string };
  "quiz.passed": { xp: number; label: string };
  "arcade.win": { coins: number };
  "chest.opened": { coins: number };
  "reward.manual": { xp: number; coins: number; label: string };
}
export type EventName = keyof EventMap;
type Handler<K extends EventName> = (payload: EventMap[K]) => void;

const handlers = new Map<EventName, Set<Handler<EventName>>>();

export function on<K extends EventName>(name: K, fn: Handler<K>): () => void {
  const set = handlers.get(name) ?? new Set();
  set.add(fn as Handler<EventName>);
  handlers.set(name, set);
  return () => set.delete(fn as Handler<EventName>);
}
export function emit<K extends EventName>(name: K, payload: EventMap[K]): void {
  handlers.get(name)?.forEach((fn) => {
    try { (fn as Handler<K>)(payload); } catch (e) { console.warn("event handler failed", name, e); }
  });
}
